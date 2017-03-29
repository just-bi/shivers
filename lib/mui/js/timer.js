/*

Copyright 2014 - 2016 Roland Bouman (roland.bouman@gmail.com)

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
var Timer;

(function(){
(Timer = function(conf){
  this.conf = conf || {};
  arguments.callee._super.apply(this, arguments);
  this.timeout = null;
}).prototype = {
  isStarted: function(){
    return this.timeout !== null;
  },
  start: function(delay){
    var me = this;
    me.cancel();
    me.timeout = win.setTimeout(function(){
      me.expire();
      me.timeout = null;
    }, delay || this.conf.delay);
  },
  cancel: function(){
    if (this.timeout !== null) {
      win.clearTimeout(this.timeout);
      this.timeout = null;
    }
  },
  expire: function(){
    this.fireEvent("expired");
  }
};

adopt(Timer, Observable);
})();