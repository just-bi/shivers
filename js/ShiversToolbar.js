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
 
var ShiversToolbar; 
(ShiversToolbar = function(conf){
  conf = conf || {};
  if (!conf.container) {
    conf.container = body;
  }
  arguments.callee._super.apply(this, arguments);
  
  var dom = cEl("input", {
    id: "file",
    type: "file",
    multiple: true,
    accept: ".analyticview,.attributeview,.calculationview"
  });
  listen(dom, "change", function(e){
    var target = e.getTarget();
    this.fireEvent("filesChanged", target.files)
  }, this);

  this.addButton([
    dom,
    new ToolbarButton({
      "classes": ["clear-log"],
      tooltip: "Clear log",
    }),
    new ToolbarButton({
      "classes": ["zip-package"],
      tooltip: "Zip",
    }),
    new ToolbarButton({
      "classes": ["rename-package"],
      tooltip: "Rename Package. Package will be renamed and all references to the package will be updated.",
    }),
    new ToolbarButton({
      "classes": ["rename-schema"],
      tooltip: "Rename Schema. All references to the schema will be updated.",
    }),
    new ToolbarButton({
      "classes": ["rename-view"],
      tooltip: "Rename View(s). All references to the views will be updated.",
    })
  ]);
  
}).prototype = {
  
};
adopt(ShiversToolbar, Toolbar);

exports.ShiversToolbar = ShiversToolbar;

  
})(typeof(exports) === "undefined" ? window : exports);