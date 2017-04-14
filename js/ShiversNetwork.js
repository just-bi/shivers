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
(function(exports){
  
var ShiversNetwork;
(ShiversNetwork = function(conf){
  this.tree = conf.tree;
  this.log = conf.log;
  this.visNodes = [];
  this.visEdges = [];
}).prototype = {
  createVisNodeData: function (pkg, name, type){
    var visNodeData = {
      id: this.tree.getViewTreeNodeId(pkg, name, type),
      label: pkg + "\n" + name,
      shape: "image",
      image: "img/" + type + "128x128.png",
      //physics: false,
      physics: true,
      font: "18px verdana grey normal"
    };
    this.visNodes.push(visNodeData);
    return visNodeData;
  },
  createVisEdgeData: function(from, to){
    var visEdgeData = {
      from: from,
      to: to,
      arrows: "to",
      smooth: {type: "cubicBezier"},
      physics: false
    };
    this.visEdges.push(visEdgeData);
    return visEdgeData;
  },
  getVisNodeDataForTab: function (tab){
    var parts, treeNodeId = tab.forTreeNode;
    parts = treeNodeId.split(":");
    var pkg = parts[1];
    parts = parts[3].split(".");
    var name = parts[0];
    var type = parts[1];
    var visNodeData = this.createVisNodeData(pkg, name, type);
    visNodeData.font = "18px verdana black bold";
    return visNodeData;
  },
  findVisNodeData: function(pkg, name, type){
    var visNodeId = this.tree.getViewTreeNodeId(pkg, name, type);
    var existingVisNodeData = this.visNodes.filter(function(node, index){
      return node.id === visNodeId;
    });
    var visNodeData;
    switch (existingVisNodeData.length) {
      case 0:
        visNodeData = null
        break;
      case 1:
        visNodeData = existingVisNodeData[0];
        break;
      default:
        throw "Duplicate node!"
    }
    return visNodeData;
  },
  getVisNodeData: function(pkg, name, type){
    var visNodeData = this.findVisNodeData(pkg, name, type);
    if (visNodeData === null) {
      visNodeData = this.createVisNodeData(pkg, name, type);
    }
    return visNodeData;
  },
  getVisNodeDataForTableNode: function(tableNode){
    var attributes = extractAttributes(tableNode, ["schemaName", "columnObjectName"]);
    var tableVisNodeData = this.getVisNodeData(attributes.schemaName, attributes.columnObjectName, "table");
    return tableVisNodeData;
  },
  parseResourceUri: function(resourceUri){
    var parts = resourceUri.split("/");
    var pkg = parts[1];
    var name = parts[3];
    var type = parts[2];
    type = type.substr(0, type.length - 1);
    return {
      pkg: pkg,
      name: name,
      type: type
    };
  },
  visualizeResourceUri: function(viewNode, resourceUri){
    resourceUri = this.parseResourceUri(resourceUri);
    var visNode = this.findVisNodeData(resourceUri.pkg, resourceUri.name, resourceUri.type);

    if (!visNode) {
      visNode = this.createVisNodeData(resourceUri.pkg, resourceUri.name, resourceUri.type);
      var treeNode = this.tree.getViewTreeNode(resourceUri.pkg, resourceUri.name, resourceUri.type);
      if (treeNode){
        var conf = treeNode.getConf();
        this.visualizeViewContents(visNode, conf.metadata);
      }
      else {
        var msg = "Warning: no treenode found for attribute view " + visNode.id + ". Skipped.";
        this.log.warn(msg);
      }
    }
    this.createVisEdgeData(viewNode.id, visNode.id);
  },
  visualizeSharedDimensions: function(analyticViewNode, privateMeasureGroupNode){
    var sharedDimensions = extractChildElement(privateMeasureGroupNode, "sharedDimensions");
    if (sharedDimensions.childNodes) {
      sharedDimensions.childNodes.forEach(function(sharedDimension){
        if (sharedDimension.nodeName !== "logicalJoin"){
          this.log.warn("Found a " + sharedDimension.nodeName + " inside sharedDimensions.");
          return;
        }
        var associatedObjectUri = extractAttribute(sharedDimension, "associatedObjectUri");
        this.visualizeResourceUri(analyticViewNode, associatedObjectUri);
      }.bind(this));
    }
  },
  visualizeAnalyticViewContents: function (analyticViewNode, viewData){
    var documentElement = extractDocumentElement(viewData);
    
    var entryNode;
    switch (documentElement.nodeName) {
      case "cube":
        entryNode = extractChildElement(documentElement, "privateMeasureGroup");
        this.visualizeSharedDimensions(analyticViewNode, entryNode);
        break;
      case "dimension":
        entryNode = documentElement;
        break;
    }
    var privateDataFoundation = extractChildElement(entryNode, "privateDataFoundation");
    var tableProxies = extractChildElement(privateDataFoundation, "tableProxies");
    var centralTableProxy;
    tableProxies.childNodes.forEach(function(node, index){
      if (node.nodeName !== "tableProxy") {
        this.log.warn("Found a " + node.nodeName + " inside the tableProxies node.");
        return;
      }
      var tableNode = extractChildElement(node, "table");
      var tableVisNodeData = this.getVisNodeDataForTableNode(tableNode);
      if (!centralTableProxy) {
        centralTableProxy = tableVisNodeData;
      }
      else     
      if (node.attributes) {
        var centralTableAttribute = extractAttribute(node, "centralTable");
        if (centralTableAttribute === "true") {
          centralTableProxy = tableVisNodeData;
        }
      }
    }.bind(this));
    if (centralTableProxy) {
      this.createVisEdgeData(analyticViewNode.id, centralTableProxy.id);
    }
    
    var joins = extractChildElement(privateDataFoundation, "joins");
    if (joins.childNodes) {
      joins.childNodes.forEach(function(node, index){
        if (node.nodeName !== "join") {
          this.log.warn("Found a " + node.nodeName + " inside the joins node.");
          return;
        }
        var leftTable = extractChildElement(node, "leftTable");
        var leftTableVisNodeData = this.getVisNodeDataForTableNode(leftTable);
        
        var rightTable = extractChildElement(node, "rightTable");
        var rightTableVisNodeData = this.getVisNodeDataForTableNode(rightTable);

        this.createVisEdgeData(leftTableVisNodeData.id, rightTableVisNodeData.id);
      }.bind(this));
    }  
  },
  visualizeCalculationViewContents: function(calculationViewNode, viewData){
    var documentElement = extractDocumentElement(viewData);
    var dataSources = extractChildElement(documentElement, "dataSources");
    if (dataSources.childNodes) {
      dataSources.childNodes.forEach(function(node, index){
        if (node.nodeName !== "DataSource") {
          this.log.warn("Warning: found a " + node.nodeName + " node inside the datasources node. Skipping.");
          return;
        }
        var type = extractAttribute(node, "type");
        switch (type) {
          case "ANALYTIC_VIEW":
          case "CALCULATION_VIEW":
            var resourceUri = extractText(node, "resourceUri");
            this.visualizeResourceUri(calculationViewNode, resourceUri);
            break;
          case "DATA_BASE_TABLE":
            var columnObject = extractChildElement(node, "columnObject");
            var columnObjectVisNodeData = this.getVisNodeDataForTableNode(columnObject);
            this.createVisEdgeData(calculationViewNode.id, columnObjectVisNodeData.id);
            break;
          default:
            this.log.warn("Warning: don't know how to handle DataSource nodes of type " + type + ". Skipping.");
            return;
        }
      }.bind(this));
    }
  },
  visualizeViewContents: function(viewNode, viewData){
    var documentElement = extractDocumentElement(viewData);
    var method;
    switch (documentElement.nodeName) {
      case "cube":
      case "dimension":
        method = this.visualizeAnalyticViewContents;
        break;
      case "scenario":
        method = this.visualizeCalculationViewContents;
        break;
    }
    method.call(this, viewNode, viewData);
  },
  visualizeView: function (tab, doc){
    var viewNode = this.getVisNodeDataForTab(tab);
    this.visualizeViewContents(viewNode, doc);
    this.visNetwork = new vis.Network(tab.component.getDom(), {
      nodes: new vis.DataSet(this.visNodes),
      edges: new vis.DataSet(this.visEdges)
    }, {
      layout: { /*
        hierarchical: {
          direction: "UD" ,
          levelSeparation: 150	
        } */
      },
      physics: {
        enabled: false,
        /*
        hierarchicalRepulsion: {
          nodeDistance: 150
        }*/
      }  
    });
    tab.shiversNetwork = this;
  }
};

exports.ShiversNetwork = ShiversNetwork;
  
})(typeof(exports) === "undefined" ? window : exports);
