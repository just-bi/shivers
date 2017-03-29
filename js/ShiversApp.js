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
      if (button.conf.classes.indexOf("download") !== -1){
        workArea.downloadCurrentNetworkAsImageFile();
      }
    }
  }
});
mainToolbar.getDom();

var workArea = new ShiversTabPane();

function appLog(msg){
  var logTab = workArea.getLogTab();
  var container = logTab.component.getDom();
  var div = cEl("DIV", null, (new Date()).toLocaleString() + ": " + msg, container);
  div.scrollIntoView();
  console.log(msg);
}
appLog("Shivers is loading...");


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
      appLog("Read file " + file.name + " (" + file.size + ")");
      var contents = e.target.result;
      appLog("Parsing file " + file.name + " (" + file.size + ")");
      var doc = parseXml(contents);
      appLog("Parsed file " + file.name + " (" + file.size + ")");
      tree.getOrCreateViewTreeNode(file, pkg, doc);
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
    tab = workArea.createTabForTreeNode(treeNode);
    new ShiversNetwork({
      tree: tree,
      appLog: appLog
    }).visualizeView(tab, treeNode.getConf().metadata);
  }
});
appLog("Shivers is ready.");
spinner.hide();
linkCss("css/shivers.css");
})(typeof(exports) === "undefined" ? window : exports);