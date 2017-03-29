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
  
var ShiversTabPane; 
(ShiversTabPane = function(conf){
  conf = conf || {};
  if (!conf.container) {
    conf.container = body;
  }
  arguments.callee._super.apply(this, arguments);
  
  this.addTab({
    text: "Welcome!",
    selected: true,
    classes: ["welcome"],
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

  this.addTab({
    text: "Log",
    selected: false,
    classes: ["log"],
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
  
}).prototype = {
  getLogTab: function(){
    return this.getTab(1);
  },
  getTabForTreeNode: function(treeNode){
    var id = treeNode.getId();
    var t, i;
    this.eachTab(function(tab, index){
      if (tab.forTreeNode === id) {
        t = tab;
        i = index;
        return false;
      }
    });
    return i;
  },
  createTabForTreeNode: function(treeNode) {
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
    this.addTab(tab);
    return tab;
  },
  getOrCreateTabForTreeNode: function(treeNode){
    var tab = this.getTabForTreeNode(treeNode);
    if (iDef(tab)){
      this.setSelectedTab(tab);
    }
    else {
      tab = this.createTabForTreeNode(treeNode);
    }
    return tab;
  },
  downloadCurrentNetworkAsImageFile: function(){
    var selectedTab = this.getSelectedTab();
    var treeNodeId = selectedTab.forTreeNode;
    var dom = selectedTab.component.getDom();
    var canvas = gEls(selectedTab.component.getDom(), "canvas")[0];
    var url = canvas.toDataURL();
    var link = cEl("a", {
      href: url,
      download: treeNodeId.replace(/:/g, "_") + ".png"
    }, null, body);
    link.click();
    dEl(link);
  }
};
adopt(ShiversTabPane, TabPane);

exports.ShiversTabPane = ShiversTabPane;
  
})(typeof(exports) === "undefined" ? window : exports);