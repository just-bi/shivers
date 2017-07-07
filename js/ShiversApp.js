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
var spinner = new Spinner();
spinner.show();

var dnd = new DDHandler({
  node: body
});
SplitPane.listenToDnd(dnd);

var mainToolbar = new ShiversToolbar({
  listeners: {
    filesChanged: function(toolbar, event, data){
      loadFiles(data)
    },
    buttonPressed: function(toolbar, event, button){
      switch (button.conf.classes[0]) {
        case "clear-log":
          clearLog();
          break;
        case "auto-layout":
          break;
        case "zip-package":
          zipPackage();
          break;
        case "rename-package":
          renamePackage();
          break;
        case "rename-schema":
          renameSchema();
          break;
        case "rename-view":
          renameView();
          break;
      }
    }
  }
});
mainToolbar.getDom();

function serializeViewSource(dom){
  var escapeXmlText = function(text){
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var escapeXmlAttribute = function(text){
    return escapeXmlText(text).replace(/"/g, "&quot;");
  };
  
  var serializeChildNodes = function(node){
    var str = "";
    if (node.childNodes) {
      node.childNodes.forEach(function(childNode){
        str += serializeNode(childNode);
      });
    }
    return str;
  };
  
  var serializeNode = function(node){
    var str = "";
    switch (node.nodeType) {
      case 1: //element

        var tagName = "";
        if (node.prefix && node.prefix.length) {
          tagName += node.prefix + ":";
        }
        tagName += node.nodeName;

        str += "\n<" + tagName;        

        var namespaces = node.namespaces;
        if (namespaces) {
          var prefix, namespaceUri;
          for (prefix in namespaces) {
            namespaceUri = namespaces[prefix];
            if (namespaceUri && namespaceUri.length) {
              str += " xmlns";
              if (prefix.length) {
                str += ":" + prefix;
              }
              str += "=\"" + namespaceUri + "\"";
            }
          }
        }
        
        var attributes = node.attributes;
        if (attributes && attributes.length) {
          attributes.forEach(function(attribute){
            str += " ";
            if (attribute.prefix && attribute.prefix.length) {
              str += attribute.prefix + ":";
            }
            str += attribute.nodeName;
            str += "=\"" + escapeXmlAttribute(attribute.value || "") + "\"";
          });
        }
        
        if (node.childNodes) {
          str += ">";
          str += serializeChildNodes(node);
          str += "</" + tagName + ">";
        }
        else {
          str += "/>";
        }
        break;
      case 3: //text
        if (node.data) {
          str += escapeXmlText(node.data);
        }
        break;
      case 7: //pi
        str += "<?" + node.target + " " + node.data + "?>";
        break;
      case 8: //comment
        str += "<!--" + node.data + "-->";
        break;
      case 9: //document
        str += serializeChildNodes(node);
        break;
    }
    return str;
  };
  return serializeNode(dom);
}

function zipPackage(){
  var packageName = prompt("Enter the name of the package you want to zip and download");
  logInfo("Zipping package: " + packageName);
  var packageTreeNode = tree.getPackageTreeNode(packageName);
  if (!packageTreeNode) {
    alert("No such package: " + packageName + ". Exiting.");
    logError("No such package: " + packageName + ". Exiting.");
    return;
  }
  var zip = new JSZip(), folder;
  packageName.split(".").forEach(function(folderName){
    folder = (folder ? folder : zip).folder(folderName);
  });
  var zipPackageAndContents = function(folder, treeNode){    
    treeNode.eachChild(function(treeNode){
      var conf = treeNode.conf;
      var nodeType = conf.classes[0];
      switch (nodeType) {
        case "package":
          folder = folder.folder(treeNode.getTitle());
          zipPackageAndContents(folder, treeNode);
          break;
        case "analyticview":
        case "attributeview":
        case "calculationview":
          var viewSource = serializeViewSource(conf.metadata);
          folder.file(treeNode.getTitle(), viewSource);
          break;
        default:
          logError("Unrecognized node type " + nodeType);
          throw new Error("Unrecognized node type " + nodeType);
      }
    })
  };
  zipPackageAndContents(folder, packageTreeNode);
  
  var promise = null;
  zip.generateAsync({type:"blob"}).then(function (blob) {
    saveAs(blob, packageName + ".zip");
  });  
}

function renamePackage(){
  var oldPackageName = prompt("Enter the name of the package you want to rename");
  logInfo("Renaming package: " + oldPackageName);
  var oldPackageTreeNode = tree.getPackageTreeNode(oldPackageName);  
  if (!oldPackageTreeNode) {
    alert("No such package: " + oldPackageName + ". Exiting.");
    logError("No such package: " + oldPackageName + ". Exiting.");
    return;
  }
  
  var newPackageName = prompt("Enter the new name for the package " + oldPackageName);
  logInfo("Rename to: " + newPackageName);
  var newPackageTreeNode = tree.getPackageTreeNode(newPackageName);  
  if (newPackageTreeNode) {
    if (!confirm("New package " + newPackageName + " already exists. Existing package contents will be overwritten. Continue?")){
      alert("Rename to existing package cancelled. Exiting.");
      logInfo("Rename to existing package cancelled. Exiting.");
      return;
    }
  }
  else
  if (!confirm("Please confirm: do you want to rename the package " + oldPackageName + " to " + newPackageName + "?")){
    alert("User Cancelled. No packages will be renamed.");
    logInfo("User Cancelled. No packages will be renamed.");
    return;
  }
  try {
    moveNode(oldPackageTreeNode, oldPackageName, newPackageName);
  }
  catch (ex){
    alert("Error renaming packages: " + ex);
    logError("Error renaming packages: " + ex);
    return;
  }
  alert("Package successfully renamed.");
  logInfo("Package successfully renamed.");
}

function moveNode(node, oldPackageName, newPackageName){
  logInfo("moveNode. Old Package: " + oldPackageName + ". New Package: " + newPackageName);
  var nodeConf = node.conf;
  var classes = nodeConf.classes;
  if (!classes || !classes.length) {
    logError("Unrecognized node type");
    throw new Error("Unrecognized node type");
  }
  var id = nodeConf.id;
  if (id.indexOf(oldPackageName) !== 0) {
    logError("Node has id " + id + ", should start with " + oldPackageName);
    throw new Error("Node has id " + id + ", should start with " + oldPackageName);
  }
  var oldPackageTreeNode = tree.getPackageTreeNode(oldPackageName);
  var nodeType = classes[0];
  switch (nodeType) {
    case "package":
      var newPackageNode = tree.getPackageTreeNode(newPackageName);
      if (newPackageNode) {
        //TODO: fix the case where the target package already exists.
        logInfo("New package " + newPackageName + " already exists.");
        var newId = newPackageName + id.substr(oldPackageName.length);
        
      }
      else {
        updatePackageReferences(null, oldPackageName, newPackageName);
        var parentPackageName = newPackageName.split(".");
        var title = parentPackageName.pop();
        parentPackageName = parentPackageName.join(".")
        var parentPackageTreeNode = tree.getOrCreatePackageTreeNode(parentPackageName);
        oldPackageTreeNode.setTitle(title);
        updatePackage(oldPackageTreeNode, oldPackageName, newPackageName);
        parentPackageTreeNode.appendTreeNode(oldPackageTreeNode);        
      }
      break;
  }
}

function updatePackage(treeNode, oldPackageName, newPackageName){
  logInfo("update package. Old Package: " + oldPackageName + ". New Package: " + newPackageName);
  var conf = treeNode.conf;
  var classes = conf.classes;
  if (!classes || !classes.length) {
    logError("Unrecognized node type");
    throw new Error("Unrecognized node type");
  }
  var id = conf.id;
  if (id.indexOf(oldPackageName) !== 0) {
    logError("Node has id " + id + ", should start with " + oldPackageName);
    throw new Error("Node has id " + id + ", should start with " + oldPackageName);
  }
  var newId = newPackageName + id.substr(oldPackageName.length);
  treeNode.setId(newId);
  var nodeType = classes[0];
  switch (nodeType){
    case "package":
      //all done
      break;
    case "analyticview":
    case "attributeview":
    case "calculationview":
      //change the package references inside the view source.
      //var metadata = conf.metadata;
      //updatePackageInViewDocument(metadata, oldPackageName, newPackageName);
      break;
    default:
      logError("Unrecognized node type " + nodeType);
      throw new Error("Unrecognized node type " + nodeType);
  }
  treeNode.eachChild(function(treeNode, index){
    updatePackage(treeNode, oldPackageName, newPackageName);
  });
}

function updatePackageReferences(treeNodes, oldPackageName, newPackageName){
  if (!treeNodes){
    treeNodes = tree.getAllTreeNodes();
  }

  if (treeNodes instanceof Array) {
    treeNodes.forEach(function(treeNode){
      updatePackageReferences(treeNode, oldPackageName, newPackageName);
    });
  }
  else
  if (treeNodes instanceof TreeNode) {
    var treeNode = treeNodes;
    var conf = treeNode.conf;
    switch (conf.classes[0]) {
      case "package":
        treeNode.eachChild(function(treeNode){
          updatePackageReferences(treeNode, oldPackageName, newPackageName);
        });
        break;
      case "analyticview":
      case "attributeview":
      case "calculationview":
        logInfo("Renaming package references from " + oldPackageName + " to " + newPackageName + " in " + conf.id);
        var metadata = conf.metadata;
        updatePackageInViewDocument(metadata, oldPackageName, newPackageName);
        break;    
      default:
        logError("Unrecognized node type " + nodeType);
        throw new Error("Unrecognized node type " + nodeType);
    }
  }
}

function updatePackageInViewDocument(metadata, oldPackageName, newPackageName){
  switch (metadata.nodeType) {
    case 1:
      if (metadata.nodeName === "resourceUri") {
        if (metadata.childNodes) {
          metadata.childNodes.forEach(function(resourceUriChildNode){
            if (resourceUriChildNode.nodeType === 3) {
              var oldUri = resourceUriChildNode.data;
              if (oldUri.indexOf(oldPackageName) !== -1) {
                var newUri = oldUri.replace(oldPackageName, newPackageName);
                logInfo("Changing resource uri " + oldUri + " to " + newUri);
                resourceUriChildNode.data = newUri;
              }
            }
          });
        }
      }
  }
  if (!metadata.childNodes){
    return;
  }
  metadata.childNodes.forEach(function(node){
    updatePackageInViewDocument(node, oldPackageName, newPackageName);
  });
}

function renameSchema(){
  var oldSchemaName = prompt("Enter the name of the schema you want to rename");
  oldSchemaName = oldSchemaName.toUpperCase();
  logInfo("Renaming schema: " + oldSchemaName);
  
  var newSchemaName = prompt("Enter the new name for the schema " + oldSchemaName);
  newSchemaName = newSchemaName.toUpperCase();
  logInfo("Rename to: " + newSchemaName);

  if (!confirm("Please confirm: do you want to rename the schema " + oldSchemaName + " to " + newSchemaName + "?")){
    alert("User Cancelled. No schema will be renamed.");
    logInfo("User Cancelled. No schema will be renamed.");
    return;
  }
  try {
    updateSchemaReferences(tree.getAllTreeNodes(), oldSchemaName, newSchemaName);
  }
  catch (ex) {
    alert("Error renaming shema: " + ex);
    logInfo("Error renaming shema: " + ex);
    return;
  }
  alert("Schema successfully renamed.");
  logInfo("Schema successfully renamed.");
}

function updateSchemaInViewDocument(metadata, oldSchemaName, newSchemaName){
  switch (metadata.nodeType) {
    case 1:
      var attributes = metadata.attributes;
      if (attributes) {
        attributes.some(function(attribute){
          if (attribute.nodeName === "schemaName") {
            if(attribute.value === oldSchemaName) {
              attribute.value = newSchemaName;
              logInfo("Renamed schameName attribute on element " + metadata.nodeName);
              return true;
            } 
          }
        });
      }
  }
  if (!metadata.childNodes){
    return;
  }
  metadata.childNodes.forEach(function(node){
    updateSchemaInViewDocument(node, oldSchemaName, newSchemaName);
  });
}

function updateSchemaReferences(treeNodes, oldSchemaName, newSchemaName){
  if (treeNodes instanceof Array) {
    treeNodes.forEach(function(treeNode){
      updateSchemaReferences(treeNode, oldSchemaName, newSchemaName);
    });
  }
  else
  if (treeNodes instanceof TreeNode) {
    var treeNode = treeNodes;
    var conf = treeNode.conf;
    var type = conf.classes[0];
    switch (type) {
      case "package":
        treeNode.eachChild(function(treeNode){
          updateSchemaReferences(treeNode, oldSchemaName, newSchemaName);
        });
        break;
      case "analyticview":
      case "attributeview":
      case "calculationview":
        logInfo("Renaming schema references from " + oldSchemaName + " to " + newSchemaName + " in " + conf.id);
        var metadata = conf.metadata;
        updateSchemaInViewDocument(metadata, oldSchemaName, newSchemaName);
        break;    
      default:
        logError("Unrecognized node type " + nodeType);
        throw new Error("Unrecognized node type " + nodeType);
    }
  }
}

function renameView(){
  var searchFor = prompt("Please enter the pattern to match");
  try {
    searchFor = new RegExp(searchFor);
  }
  catch(e) {
    alert("Invalid pattern " + e);
    logError("Invalid pattern " + e);    
    return;    
  }
  var replaceWith = prompt("Please enter the text to replace the matched pattern with");
  if (confirm("Would you like to test your rename action?")){
    do {
      var test = prompt("Enter a string to apply replace " + searchFor + " with \"" + replaceWith + "\":");
      if (!searchFor.test(test)) {
        alert("The search patter " + searchFor + " does not match your text \"" + test + "\". Nothing will be replaced");
      }
      else 
      if (confirm("Replacing " + searchFor + " with \"" + replaceWith + "\" in \"" + test + "\" yields:\n\n" + test.replace(searchFor, replaceWith) + "\n\nIs that correct?")){
        continue;
      }
      else {
        return;
      }
    } while (confirm("Would you like to run another test?"));
  }
  if (!confirm("You are now about to replace " + searchFor + " with \"" + replaceWith + "\" in all loaded views. Continue?")){
    return;
  }
  renameViewName(null, searchFor, replaceWith);
}

function renameViewName(treeNodes, searchFor, replaceWith){
  if (!treeNodes){
    treeNodes = tree.getAllTreeNodes();
    if (treeNodes.length === 0) {
      alert("No views loaded to rename. Exiting");
      return;
    }
  }
  if (!(searchFor instanceof RegExp)){
    searchFor = new RegExp(searchFor);
  }

  if (treeNodes instanceof Array) {
    treeNodes.forEach(function(treeNode){
      renameViewName(treeNode, searchFor, replaceWith);
    });
  }
  else
  if (treeNodes instanceof TreeNode) {
    var treeNode = treeNodes;
    var conf = treeNode.conf;
    switch (conf.classes[0]) {
      case "package":
        treeNode.eachChild(function(treeNode){
          renameViewName(treeNode, searchFor, replaceWith);
        });
        break;
      case "analyticview":
      case "attributeview":
      case "calculationview":
        renameViewNode(treeNode, searchFor, replaceWith);        
        var metadata = conf.metadata;
        renameViewInViewDocument(metadata, searchFor, replaceWith);
        break;    
      default:
        logError("Unrecognized node type " + nodeType);
        throw new Error("Unrecognized node type " + nodeType);
    }
  }
}

function renameViewNode(treeNode, searchFor, replaceWith){
  var conf = treeNode.conf;
  var id = conf.id;
  id = id.split("::");
  if (id.length !== 2) {
    logError("renameView: something is wrong with the id of view node " + conf.id + ": can't find package.");
    throw new Error("renameView: something is wrong with the id of view node " + conf.id + ": can't find package.");
  }
  var packageName = id[0];
  id = id[1].split(".");
  if (id.length !== 2) {
    logError("renameView: something is wrong with the id of view node " + conf.id + ": can't find extension.");
    throw new Error("renameView: something is wrong with the id of view node " + conf.id + ": can't find extension.");
  }
  var extension = id[1];
  if (!searchFor.test(id[0])) {
    return;
  }
  var newTitle = id[0].replace(searchFor, replaceWith) + "." + extension;
  var newId = packageName + "::" + newTitle;
  logInfo("renameView: view with id " + conf.id + " is to be renamed to: " + newId);
  if (TreeNode.getInstance("node:" + newId)) {
    logError("View with id " + newId + " already exists!");
    if (!confirm("View with id " + newId + " already exists and will not be replaced. Continue or abort?")){
      throw Error("View with id " + newId + " already exists!");
    }
  }
  treeNode.setId(newId);
  treeNode.setTitle(newTitle);
}

function renameViewInViewDocument(metadata, searchFor, replaceWith){
  switch (metadata.nodeType) {
    case 1:
      if (metadata.nodeName === "resourceUri") {
        if (metadata.childNodes) {
          metadata.childNodes.forEach(function(resourceUriChildNode){
            if (resourceUriChildNode.nodeType === 3) {
              var oldUri = resourceUriChildNode.data;
              oldUri = oldUri.split("/");
              var name = oldUri[oldUri.length - 1];
              if (!searchFor.test(name)) {
                return;
              }
              name = name.replace(searchFor, replaceWith);
              oldUri[oldUri.length - 1] = name;
              logInfo("Renamed " + resourceUriChildNode.data + " to " + oldUri.join("/"));
              resourceUriChildNode.data = oldUri.join("/");
            }
          });
        }
      }
  }
  if (!metadata.childNodes){
    return;
  }
  metadata.childNodes.forEach(function(node){
    renameViewInViewDocument(node, searchFor, replaceWith);
  });
}

var workArea = new ShiversTabPane();

function getLogTab(){
  var logTab = workArea.getTab(1);
  return logTab;
}

function clearLog(){
  var logTab = getLogTab();
  if (!logTab) {
    return;
  }
  var dom = logTab.component.getDom();
  dom.innerHTML = "";
}

function appLog(msg, type){
  var logTab = getLogTab();
  if (logTab) {
    var container = logTab.component.getDom();
    var div = cEl("DIV", null, (new Date()).toLocaleString() + ": " + msg, container);
    div.setAttribute("class", "log " + (type || ""));
    div.scrollIntoView();
  }
  if (typeof(console[type]) === "function") {
    console[type](msg);
  }
  else {
    console.log(msg);
  }
}

function logInfo(msg) {
  appLog(msg, "info");
}
function logError(msg) {
  appLog(msg, "error");
}
function logWarning(msg) {
  appLog(msg, "warn");
}
logInfo("Shivers is loading...");


var tree = new ShiversTree();

var mainSplitPane = new SplitPane({
  container: body,
  classes: ["mainsplitpane"],
  firstComponent: tree,
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
      logInfo("Read file " + file.name + " (" + file.size + " bytes)");
      var contents = e.target.result;
      logInfo("Parsing file " + file.name + " (" + file.size + " bytes)");
      var doc = parseXml(contents);
      logInfo("Parsed file " + file.name + " (" + file.size + " bytes)");
      tree.getOrCreateViewTreeNode(file, pkg, doc);
    }
    catch (e) {
      logError("Error occurred loading file " + file.name + ": " + e);
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
      logWarning("Warning: file " + name + " is not an information view source. Not loaded." );
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
  logInfo("Using " + pkg + " as package name.");
  var i, n, file;
  for (i = 0, n = files.length; i < n; i++){
    file = files[i];
    if (file.kind) {
      if (file.kind !== "file") {
        logWarning("Warning: not loading item that is not a file.");
        continue;
      }
      file = file.getAsFile();
    }
    logInfo("Loading file " + file.name + " (" + file.size + ")");
    loadFile(pkg, file);    
  }
}


tree.getTreeSelection().listen("selectionChanged", function(treeSelection, eventName, eventData){
  var newSelection = eventData.newSelection;
  if (!newSelection.length) {
    return;
  }
  var treeNode = newSelection[0];
  if (treeNode.getConf().classes.indexOf("package")!==-1){
    return;
  }
  var tab = workArea.getTabForTreeNode(treeNode);
  if (iDef(tab)){
    workArea.setSelectedTab(tab);
  }
  else {
    spinner.show();
    tab = workArea.createTabForTreeNode(treeNode);
    new ShiversNetwork({
      tree: tree,
      log: {
        info: logInfo,
        error: logError,
        warn: logWarning
      }
    }).visualizeView(tab, treeNode.getConf().metadata);
    spinner.hide();
  }
});
logInfo("Shivers is ready.");
spinner.hide();
linkCss("css/shivers.css");
})(typeof(exports) === "undefined" ? window : exports);