/*

Copyright 2017 http://www,just-bi.nl; Roland Bouman (roland.bouman@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
function parseXml(xml) {
  //         1234             5           67            8                            9111            12             13   14          15  16                   17
  var re = /<(((([\w\-\.]+):)?([\w\-\.]+))((\s+[^=]+=\s*("[^"]*"|'[^']*'))*)\s*\/?|\/((([\w\-\.]+):)?([\w\-\.]+))|\?(\w+)([^\?]+)?\?|(!--([^\-]|-[^\-])*--))>|([^<]+)/ig,
      match, name, prefix, atts, ePrefix, eName, piTarget, text,
      ns = {"": ""}, newNs, nsUri, doc, parentNode, namespaces = [], nextParent, node = null
  ;
  doc = parentNode = {
    nodeType: 9,
    childNodes: []
  };

  function Ns(){
      namespaces.push(ns);
      var _ns = new (function(){});
      _ns.constructor.prototype = ns;
      ns = new _ns.constructor();
      node.namespaces = ns;
      newNs = true;
  }
  function popNs() {
      ns = namespaces.pop();
  }
  function unescapeEntities(text) {
    return text.replace(/&((\w+)|#(x?)([0-9a-fA-F]+));/g, function(match, g1, g2, g3, g4, idx, str){
      if (g2) {
        var v = ({
          lt: "<",
          gt: ">",
          amp: "&",
          apos: "'",
          quot: "\""
        })[g2];
        if (v) {
          return v;
        }
        else {
          throw "Illegal named entity: " + g2;
        }
      }
      else {
        return String.fromCharCode(parseInt(g4, g3 ? 16: 10));
      }
    });
  }
  while (match = re.exec(xml)) {
      node = null;
      if (name = match[5]) {
          newNs = false;
          node = {
              offset: match.index,
              parentNode: parentNode,
              nodeType: 1,
              nodeName: name
          };
          nextParent = node;
          if (atts = match[6]) {
              var attMatch, att;
              //           123          4               5 6         7
              var attRe = /((([\w\-]+):)?([\w\-]+))\s*=\s*('([^']*)'|"([^"]*)")/g;
              while(attMatch = attRe.exec(atts)) {
                  var pfx = attMatch[3] || "",
                      value = attMatch[attMatch[6] ? 6 : 7]
                  ;
                  if (attMatch[1].indexOf("xmlns")) {
                      if (!node.attributes) {
                        node.attributes = [];
                      }
                      att = {
                          nodeType: 2,
                          prefix: pfx,
                          nodeName: attMatch[4],
                          value: unescapeEntities(value)
                      };
                      nsUri = (pfx === "") ? "" : ns[pfx];
                      if (iUnd(nsUri)) {
                          throw "Unrecognized namespace with prefix \"" + prefix + "\"";
                      }
                      att.namespaceURI = nsUri;
                      node.attributes.push(att);
                  }
                  else {
                    if (!newNs) {
						          Ns();
					          }
                    ns[attMatch[3] ? attMatch[4] : ""] = value;
                  }
              }
              attRe.lastIndex = 0;
          }
          prefix = match[4] || "";
          node.prefix = prefix;
          nsUri = ns[prefix];
          if (iUnd(nsUri)) {
              throw "Unrecognized namespace with prefix \"" + prefix + "\"";
          }
          node.namespaceURI = nsUri;

          if (match[1].charAt(match[1].length - 1) === "\/") {
            nextParent = node.parentNode;
            if (ns === node.namespaces){
              popNs();  
            } 
          }
      }
      else
      if (eName = match[12]) {
          ePrefix = match[11] || "";
          if (parentNode.nodeName === eName && parentNode.prefix === ePrefix) {
              nextParent = parentNode.parentNode;
              if (ns === parentNode.namespaces) {
                 popNs();
              }
          }
          else {
              throw "Unclosed tag " + ePrefix + ":" + eName;
          }
      }
      else
      if (piTarget = match[13]) {
          node = {
              offset: match.index,
              parentNode: parentNode,
              target: piTarget,
              data: match[14],
              nodeType: 7
          };
      }
      else
      if (match[15]) {
          node = {
              offset: match.index,
              parentNode: parentNode,
              nodeType: 8,
              data: match[16]
          };
      }
      else
      if ((text = match[17]) && (!/^\s+$/.test(text))) {
          node = {
              offset: match.index,
              parentNode: parentNode,
              nodeType: 3,
              data: unescapeEntities(text)
          };
      }
      if (node) {
          if (!parentNode.childNodes) parentNode.childNodes = [];
          parentNode.childNodes.push(node);
      }
      if (nextParent) parentNode = nextParent;
  }
  return doc;
};

function extractDocumentElement(node){
  if (node.nodeType !== 9) {
    throw "Node is not a document node.";
  }
  if (node.childNodes) {
    return node.childNodes.filter(function(node){
      return node.nodeType === 1;
    })[0];
  }
  else {
    throw "No document element found!";
  }
}

function extractChildElement(node, name){
  var childNode = null;
  if (node.childNodes) {
    childNode = node.childNodes.filter(function(node){
      return node.nodeType === 1 && node.nodeName === name;
    });
    switch (childNode.length) {
      case 0:
        break;
      case 1:
        childNode = childNode[0];
        break;
      default:
        throw "Multiple nodes found.";
    }
  }
  return childNode;
}

function extractAttributes(node, attributeNames){
  var atts = {};
  if (node.attributes) {
    node.attributes.filter(function(node){
      var result;
      if (typeof(attributeNames) === "undefined") {
        result = true;
      }
      else 
      if (attributeNames.indexOf(node.nodeName) === -1){
        result = false;
      }
      else {
        result = true;
      }
      return result;
    }).forEach(function(node){
      atts[node.nodeName] = node.value;
    });
  }
  return atts;
}

function extractAttribute(node, attributeName){
  var atts = extractAttributes(node, [attributeName]);
  return atts[attributeName];
}

function extractText(node, name) {
  if (name) {
    node = extractChildElement(node, name);
  }
  var text;
  if (node.childNodes) {
    text = node.childNodes.map(function(node){
      var text;
      if (node.nodeType === 3) {
        text = node.data;
      }
      else {
        text = "";
      }
      return text;
    });
    text = text.join("");
  }
  return text;
}