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
  
var ShiversTree;

(ShiversTree = function(conf){
  arguments.callee._super.apply(this, arguments);
}).prototype = {
  createDom: function(){
    var dom = ContentPane.prototype.createDom.apply(this, arguments);
    this.treeListener = new TreeListener({container: dom});
    this.treeSelection = new TreeSelection({treeListener: this.treeListener});
    this.checkLoadTree();
    return dom;
  },
  loadTree: function(){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      
    };
    var url = document.location.path
    xhr.open("GET", url, true);
  },
  checkLoadTree: function(){
    switch (document.location.protocol) {
      case "https":
      case "https:":
        this.loadTree();
        break;
      default:
    }
  },
  getTreeSelection: function(){
    return this.treeSelection;
  },
  getAllTreeNodes: function(){
    var dom = this.getDom();
    var childNode, treeNode, childNodes = dom.childNodes, n = childNodes.length, i;
    var treeNodes = [];
    for (i = 0; i < n; i++) {
      childNode = childNodes[i];
      treeNode = TreeNode.lookup(childNode);
      if (treeNode) {
        treeNodes.push(treeNode);
      }
    }
    return treeNodes;
  },
  getPackageTreeNode: function(pkg){
    var node = TreeNode.getInstance("node:" + pkg);
    return node;
  },
  getOrCreatePackageTreeNode: function(pkg){
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
          conf.parentElement = this.getDom();
        }
        node = new TreeNode(conf);
      }
      packageNode = node;
    }.bind(this));
    return packageNode;
  },
  getViewTreeNodeId: function (pkg, name, extension){
    return pkg + "::" + name + "." + extension;
  },
  getViewTreeNode: function(pkg, name, extension){
    var viewTreeNodeId = this.getViewTreeNodeId(pkg, name, extension);
    var viewTreeNode = TreeNode.getInstance("node:" + viewTreeNodeId);
    return viewTreeNode;
  },
  createViewTreeNode: function(pkg, name, extension){
    var viewTreeNodeId = this.getViewTreeNodeId(pkg, name, extension);
    var packageNode = this.getOrCreatePackageTreeNode(pkg);
    var viewTreeNode = new TreeNode({
      title: name + "." + extension,
      id: viewTreeNodeId,
      parentTreeNode: packageNode,
      state: TreeNode.states.leaf,
      classes: [extension]
    });
    return viewTreeNode;
  },
  getOrCreateViewTreeNode: function (file, pkg, doc){
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
    var viewTreeNode = this.getViewTreeNode(pkg, name, extension);
    if (!viewTreeNode) {
      viewTreeNode = this.createViewTreeNode(pkg, name, extension);
    }
    viewTreeNode.getConf().metadata = doc;
    return viewTreeNode;
  },
  getTreeNodes: function(){
    var dom = this.getDom(), treeNodes = [];
    var domTreeNodes = dom.getElementsByClassName("node");    
    var i, n = domTreeNodes.length;
    for (i = 0; i < n; i++) {
      treeNodes.push(TreeNode.lookup(domTreeNodes[i]));
    }
    return treeNodes;
  }
};
adopt(ShiversTree, ContentPane);

exports.ShiversTree = ShiversTree;  
  
})(typeof(exports) === "undefined" ? window : exports);