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
(function(){
var spinner = new Spinner();
spinner.show();

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

var mainToolbar = new Toolbar({
  container: body
});

mainToolbar.addButton([
  typeof(FileReader) === "undefined" ? {"class": "separator"} : cEl("input", {
    id: "file",
    type: "file",
    multiple: true,
    accept: ".analyticview,.attributeview,.calculationview"
  })
]);

if (typeof(FileReader) !== "undefined") {
  listen(gEl("file"), "change", function(e){
    var target = e.getTarget();
    loadFiles(target.files);
  });
}

mainToolbar.getDom();

var workArea = new TabPane();

workArea.addTab({
  text: "Welcome!",
  selected: true,
  component: {
    getDom: function(){
      var id = "___docTab";
      var docTab = gEl(id);
      if (!docTab) {
        var loc = document.location;
        var url = loc.pathname.split("\/");
        url.pop();
        url.push("doc");
        url.push("index.html");
        url = loc.origin + url.join("\/");
        docTab = cEl("IFRAME", {
          id: id,
          style: {
            "border-style": "none"
          },
          width: "100%",
          height: "100%",
          src: url
        });
      }
      return docTab;
    }
  }
});

workArea.addTab({
  text: "Log",
  selected: false,
  component: {
    getDom: function(){
      var id = "___logTab";
      var logTab = gEl(id);
      if (!logTab) {
        logTab = cEl("DIV", {
          id: id,
          style: {
            "font-family": "monospace",
            "overflow": "scroll",
            "position": "absolute",
            "width": "100%",
            "top": "0px",
            "bottom": "0px"
          },
        });
      }
      return logTab;
    }
  }
});

function appLog(msg){
  var logTab = workArea.getTab(1);
  if (logTab) {
    var container = logTab.component.getDom();
    var div = cEl("DIV", null, (new Date()).toLocaleString() + ": " + msg, container);
    div.scrollIntoView();
  }
  console.log(msg);
}
appLog("Shivers is loading...");

function getTabForTreeNode(treeNode){
  var id = treeNode.getId();
  var t, i;
  workArea.eachTab(function(tab, index){
    if (tab.forTreeNode === id) {
      t = tab;
      i = index;
      return false;
    }
  });
  return i;
}
function createTabForTreeNode(treeNode) {
  var treeNodeConf = treeNode.getConf();
  var div = cEl("DIV");
  var tab = {
    selected: true,
    closeable: true,
    forTreeNode: treeNode.getId(),
    text: treeNodeConf.title,
    classes: treeNodeConf.classes,
    component: new ContentPane({
      classes: ["vis-contentpane"]
    })
  };
  workArea.addTab(tab);
  visualizeView(tab, treeNodeConf.metadata);
}

function visualizeViewContents(viewNode, viewData, visNodes, visEdges){
  var documentElement = extractDocumentElement(viewData);
  var method;
  switch (documentElement.nodeName) {
    case "cube":
    case "dimension":
      method = visualizeAnalyticViewContents;
      break;
    case "scenario":
      method = visualizeCalculationViewContents;
      break;
  }
  method.call(null, viewNode, viewData, visNodes, visEdges);
}

function visualizeView(tab, doc){
  var visNodes = [], visEdges = [];  
  var viewNode = getVisNodeDataForTab(tab);
  visNodes.push(viewNode);
  visualizeViewContents(viewNode, doc, visNodes, visEdges);
  tab.network = new vis.Network(tab.component.getDom(), {
    nodes: new vis.DataSet(visNodes),
    edges: new vis.DataSet(visEdges)
  }, { /*
    layout: {
      hierarchical: {
        direction: "UD" ,
        levelSeparation: 150	
      }
    },*/
    physics: {
      hierarchicalRepulsion: {
        nodeDistance: 150
      }
    }  
  });
}

function makeVisNodeId(pkg, name, type){
  return pkg + "::" + name + "." + type;
}

function createVisNodeData(pkg, name, type){
  return {
    id: makeVisNodeId(pkg, name, type),
    label: pkg + "\n" + name,
    shape: "image",
    image: "img/" + type + "128x128.png"
  };
}

function findVisNodeData(pkg, name, type, visNodes){
  var visNodeId = makeVisNodeId(pkg, name, type);
  var existingVisNodeData = visNodes.filter(function(node, index){
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
}

function getVisNodeData(pkg, name, type, visNodes){
  var visNodeData = findVisNodeData(pkg, name, type, visNodes);
  if (visNodeData === null) {
    visNodeData = createVisNodeData(pkg, name, type);
    visNodes.push(visNodeData);
  }
  return visNodeData;
}

function getVisNodeDataForTableNode(tableNode, visNodes){
  var attributes = extractAttributes(tableNode, ["schemaName", "columnObjectName"]);
  var tableVisNodeData = getVisNodeData(attributes.schemaName, attributes.columnObjectName, "table", visNodes);
  return tableVisNodeData;
}

function createVisEdgeData(from, to){
  return {
    from: from,
    to: to,
    arrows: "to",
    smooth: {type: "cubicBezier"},
    physics: false
  }
}

function getVisNodeDataForTab(tab){
  var parts, treeNodeId = tab.forTreeNode;
  parts = treeNodeId.split(":");
  var pkg = parts[1];
  parts = parts[3].split(".");
  var name = parts[0];
  var type = parts[1];
  return createVisNodeData(pkg, name, type);
}

function parseResourceUri(resourceUri){
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
}

function visualizeResourceUri(viewNode, resourceUri, visNodes, visEdges){
  resourceUri = parseResourceUri(resourceUri);
  var visNode = findVisNodeData(resourceUri.pkg, resourceUri.name, resourceUri.type, visNodes);

  if (!visNode) {
    visNode = createVisNodeData(resourceUri.pkg, resourceUri.name, resourceUri.type);
    visNodes.push(visNode);
    var treeNode = TreeNode.getInstance("node:" + visNode.id);
    if (treeNode){
      var conf = treeNode.getConf();
      visualizeViewContents(visNode, conf.metadata, visNodes, visEdges);
    }
    else {
      var msg = "Warning: no treenode found for attribute view " + visNode.id + ". Skipped.";
      appLog(msg);
    }
  }
  visEdges.push(createVisEdgeData(viewNode.id, visNode.id));
}

function visualizeSharedDimensions(analyticViewNode, privateMeasureGroupNode, visNodes, visEdges){
  var sharedDimensions = extractChildElement(privateMeasureGroupNode, "sharedDimensions");
  if (sharedDimensions.childNodes) {
    sharedDimensions.childNodes.forEach(function(sharedDimension){
      if (sharedDimension.nodeName !== "logicalJoin"){
        appLog("Found a " + sharedDimension.nodeName + " inside sharedDimensions.");
        return;
      }
      var associatedObjectUri = extractAttribute(sharedDimension, "associatedObjectUri");
      visualizeResourceUri(analyticViewNode, associatedObjectUri, visNodes, visEdges);
    });
  }
}

function visualizeAnalyticViewContents(analyticViewNode, viewData, visNodes, visEdges){
  var documentElement = extractDocumentElement(viewData);
  
  var entryNode;
  switch (documentElement.nodeName) {
    case "cube":
      entryNode = extractChildElement(documentElement, "privateMeasureGroup");
      visualizeSharedDimensions(analyticViewNode, entryNode, visNodes, visEdges);
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
      appLog("Found a " + node.nodeName + " inside the tableProxies node.");
      return;
    }
    var tableNode = extractChildElement(node, "table");
    var tableVisNodeData = getVisNodeDataForTableNode(tableNode, visNodes);
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
  });
  if (centralTableProxy) {
    visEdges.push(createVisEdgeData(analyticViewNode.id, centralTableProxy.id));
  }
  
  var joins = extractChildElement(privateDataFoundation, "joins");
  if (joins.childNodes) {
    joins.childNodes.forEach(function(node, index){
      if (node.nodeName !== "join") {
        appLog("Found a " + node.nodeName + " inside the joins node.");
        return;
      }
      var leftTable = extractChildElement(node, "leftTable");
      var leftTableVisNodeData = getVisNodeDataForTableNode(leftTable, visNodes);
      
      var rightTable = extractChildElement(node, "rightTable");
      var rightTableVisNodeData = getVisNodeDataForTableNode(rightTable, visNodes);

      visEdges.push(createVisEdgeData(leftTableVisNodeData.id, rightTableVisNodeData.id));
    });
  }  
}

function visualizeCalculationViewContents(calculationViewNode, viewData, visNodes, visEdges){
  var documentElement = extractDocumentElement(viewData);
  var dataSources = extractChildElement(documentElement, "dataSources");
  if (dataSources.childNodes) {
    dataSources.childNodes.forEach(function(node, index){
      if (node.nodeName !== "DataSource") {
        appLog("Warning: found a " + node.nodeName + " node inside the datasources node. Skipping.");
        return;
      }
      var type = extractAttribute(node, "type");
      switch (type) {
        case "ANALYTIC_VIEW":
        case "CALCULATION_VIEW":
          var resourceUri = extractText(node, "resourceUri");
          visualizeResourceUri(calculationViewNode, resourceUri, visNodes, visEdges);
          break;
        case "DATA_BASE_TABLE":
          var columnObject = extractChildElement(node, "columnObject");
          var columnObjectVisNodeData = getVisNodeDataForTableNode(columnObject, visNodes);
          visEdges.push(createVisEdgeData(calculationViewNode.id, columnObjectVisNodeData.id));
          break;
        default:
          appLog("Warning: don't know how to handle DataSource nodes of type " + type + ". Skipping.");
          return;
      }
    });
  }
}

var topPane = new ContentPane();

var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: topPane,
  secondComponent: workArea,
  orientation: SplitPane.orientations.vertical,
  style: {
    top: (mainToolbar ? 32 : 0) + "px"
  }
});

var oldSplitterPosition = 200;
setTimeout(function(){
  mainSplitPane.setSplitterPosition(oldSplitterPosition + "px");
  windowResized();
}, 200);

mainSplitPane.getDom();

/**
*   Resize window stuff
*/
var resizeEvent = {
  factor: .33
};
function windowResized(){
  if (resizeEvent === null) {
    return;
  }
  mainSplitPane.setSplitterPosition((100 * resizeEvent.mainSplitPaneFactor) + "%");
  resizeEvent = null;
}
var resizeTimer = new Timer({
  delay: 100,
  listeners: {
    expired: windowResized
  }
});

listen(window, "resize", function(){
  if (resizeEvent === null) {
    resizeEvent = {
      mainSplitPaneFactor: mainSplitPane.getSplitterRatio(),
    };
  }
  resizeTimer.start();
});

function getPackageTreeNode(pkg){
  pkg = pkg.split(".");
  var packageNode;
  pkg.forEach(function(part, index){
    var id = pkg.slice(0, index + 1).join(".");
    var node = TreeNode.getInstance("node:" + id);
    if (!node) {
      var conf = {
        id: id,
        title: part,
        state: TreeNode.states.expanded,
        classes: ["package"]
      };
      if (packageNode) {
        conf.parentTreeNode = packageNode;
      }
      else {
        conf.parentElement = topPane.getDom();
      }
      node = new TreeNode(conf);
    }
    packageNode = node;
  });
  return packageNode;
}


function addViewSource(file, pkg, doc){
  var documentElement = extractDocumentElement(doc);
  //THe id is probably not the right thing, occasionally id and filename are not identical.
  //var name = extractAttribute(documentElement, "id");
  var name = file.name;
  var extension;
  switch (documentElement.nodeName) {
    case "cube":
      extension = "analyticview";
      break;
    case "dimension":
      extension = "attributeview";
      break;
    case "scenario":
      extension = "calculationview";
      break;
  }
  name = name.substr(0, name.indexOf("." + extension));
  var visNodeId = makeVisNodeId(pkg, name, extension);
  var viewTreeNode = TreeNode.getInstance("node:" + visNodeId);
  if (!viewTreeNode) {
    var packageNode = getPackageTreeNode(pkg);
    var viewTreeNode = new TreeNode({
      title: name + "." + extension,
      id: visNodeId,
      parentTreeNode: packageNode,
      state: TreeNode.states.leaf,
      classes: [extension]
    });
  }
  viewTreeNode.getConf().metadata = doc;
}

body.ondrop = function(ev){
  ev.preventDefault();
  var dt = ev.dataTransfer, items, item, i, n;
  loadFiles(dt.items || item.files);
};

body.ondragover = function(ev){
  ev.preventDefault();
};

body.ondragend = function(ev){
  ev.preventDefault();  
};

function readFile(pkg, file){
  var reader = new FileReader();
  reader.onload = function(e){
    try {
      appLog("Read file " + file.name + " (" + file.size + ")");
      var contents = e.target.result;
      appLog("Parsing file " + file.name + " (" + file.size + ")");
      var doc = parseXml(contents);
      appLog("Parsed file " + file.name + " (" + file.size + ")");
      addViewSource(file, pkg, doc);
    }
    catch (e) {
      appLog("Error occurred loading file " + file.name + ": " + e);
    }
  }
  reader.readAsText(file);  
}

function loadFile(pkg, file) {
  var name = file.name;
  name = name.split(".");
  var extension = name.pop();
  switch (extension.toLowerCase()) {
    case "analyticview":
    case "attributeview":
    case "calculationview":
      readFile(pkg, file);  
      break;
    default:
      appLog("Warning: file " + name + " is not an information view source. Not loaded." );
  }
}

function loadFiles(files) {
  if (!files.length) {
    alert("No files selected.");
    return;
  }
  var pkg = prompt("Please enter a package name. (Use either ., \/, or \\ to separate package names.");
  if (pkg.indexOf(".") === -1){
    if (pkg.indexOf("\/")!==-1 && pkg.indexOf("\\")===-1){
      pkg = pkg.replace(/\//g, ".");
    } 
    else 
    if (pkg.indexOf("\/")===-1 && pkg.indexOf("\\")!==-1){
      pkg = pkg.replace(/\\/g, ".");
    }
  }
  appLog("Using " + pkg + " as package name.");
  var i, n, file;
  for (i = 0, n = files.length; i < n; i++){
    file = files[i];
    if (file.kind) {
      if (file.kind !== "file") {
        appLog("Warning: not loading item that is not a file.");
        continue;
      }
      file = file.getAsFile();
    }
    appLog("Loading file " + file.name + " (" + file.size + ")");
    loadFile(pkg, file);    
  }
}

var treeListener = new TreeListener({container: topPane.getDom()});
var treeSelection = new TreeSelection({treeListener: treeListener});

treeSelection.listen("selectionChanged", function(treeSelection, eventName, eventData){
  var newSelection = eventData.newSelection;
  if (!newSelection.length) {
    return;
  }
  var treeNode = newSelection[0];
  if (treeNode.getConf().classes.indexOf("package")!==-1){
    return;
  }
  var tab = getTabForTreeNode(treeNode);
  if (iDef(tab)){
    workArea.setSelectedTab(tab);
  }
  else {
    createTabForTreeNode(treeNode);
  }
});
appLog("Shivers is ready.");
spinner.hide();
})();