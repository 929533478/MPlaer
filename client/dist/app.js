webpackJsonp([0],[
/* 0 */
/***/ function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ },
/* 1 */
/***/ function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;
	var sourceMap = obj.sourceMap;

	if (media) {
		styleElement.setAttribute("media", media);
	}

	if (sourceMap) {
		// https://developer.chrome.com/devtools/docs/javascript-debugging
		// this makes source maps inside style tags work properly in Chrome
		css += '\n/*# sourceURL=' + sourceMap.sources[0] + ' */';
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__apiProxy__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__localCache__ = __webpack_require__(7);




const MPLAYER_PL = '_MPlayer_PlayingList_'

const defaultState = {
    loading:false, /* 是否loading */
    status:0,    /*  播放状态 */
    playingId:-1, /* 播放的id */
    songs:[],
    artists:[],
    albums:[]
}

/* 本地缓存 */
const localCache = {
    playingList:[{
        songname:'海阔天空',
        songid:'268425156'
    },{
        songname:'火星人来过',
        songid:'278860063'  
    }]
}

localCache.playingList = __WEBPACK_IMPORTED_MODULE_1__localCache__["a" /* default */].getCache(MPLAYER_PL) || localCache.playingList


/* harmony default export */ exports["a"] = {    
    state:defaultState,   
    async search(keyWords){
        let datas = await __WEBPACK_IMPORTED_MODULE_0__apiProxy__["a" /* default */].search(keyWords)
        return datas
     },
     async songDetail(id){
         let detail = await __WEBPACK_IMPORTED_MODULE_0__apiProxy__["a" /* default */].songDetail(id)
         return detail
     },


    cache:localCache,    
    addSong(songs){
        if(songs instanceof Array){
            /* 同样可以push */
            this.cache.playingList.splice(0,0,...songs)
        }else{
            if(this.cache.playingList.findIndex(s=>s.songid == songs.songid) < 0){
             this.cache.playingList.push(songs)
            }
        }
        __WEBPACK_IMPORTED_MODULE_1__localCache__["a" /* default */].setCache(MPLAYER_PL,this.cache.playingList)
    },
    removeSong(id){
        let index = this.cache.playingList.findIndex(value=> value.songid === id)
        if(index>=0){
            this.cache.playingList.splice(index,1)
        } 
        __WEBPACK_IMPORTED_MODULE_1__localCache__["a" /* default */].setCache(MPLAYER_PL,this.cache.playingList)       
    },
    clearSongs(){
        this.cache.playingList.splice(0, this.cache.playingList.length)
        __WEBPACK_IMPORTED_MODULE_1__localCache__["a" /* default */].setCache(MPLAYER_PL,this.cache.playingList)
    }
};


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
const defaultOptions = {
    headers:{
        isFetch:1
    }
}

/* harmony default export */ exports["a"] = {
    baseUrl:'/api/',
    fetchData(url,options = defaultOptions){
        return new Promise((resolve,reject)=>{
            fetch(url,options).then(response=>response.json())
            .then(data=>resolve(data)).catch(err=>reject(err))
        })
    },
    async search(title){
       let datas = await this.fetchData(this.baseUrl + 'search/'+ title)
       return datas
    },
    async songDetail(id){
        let data  = await this.fetchData(this.baseUrl + 'song/detail/' + id)
        return data
    },    
    async artistIfo(uid){
        let data  = await this.fetchData(this.baseUrl + 'artist/info/' + uid)
        return data
    },
    async lry(id){
        let data  = await this.fetchData(this.baseUrl + 'lry/' + id)
        return data
    },

};

/***/ },
/* 4 */,
/* 5 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(18)

/* script */
__vue_exports__ = __webpack_require__(26)

/* template */
var __vue_template__ = __webpack_require__(37)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 6 */,
/* 7 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony default export */ exports["a"] = {
    getCache(key){
        let data = localStorage.getItem(key)
        return data !== null ? JSON.parse(data):null
    },
    setCache(key,value){
        localStorage.setItem(key,JSON.stringify(value))
    }
};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, ".ui-reelList-header-column{position:relative;display:inline-block;width:26%}.ui-reelList-cell,.ui-reelList-header-column{padding:0}.ui-reelList-row{position:relative}", ""]);

// exports


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, ".playingList li{color:rgba(41,79,52,.6);margin:0 0 0 30px}.playingList .text{color:inherit}.playingItem{background-color:rgba(68,141,119,.24)}.playingList .song-item{float:right;position:absolute;right:30px}.hide{display:none}.show{display:\"inline-block\"}", ""]);

// exports


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, "#player{width:100%}.mb-layout-ft{text-align:left}.left-panel{position:absolute;left:0;top:0}.main-panel{width:auto;margin:22px 150px}.right-panel{position:absolute;width:120px;top:22px;right:0}", ""]);

// exports


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, ".ui-reelList-cell{position:relative;display:inline-block;width:26%}", ""]);

// exports


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, ".column2{right:280px}", ""]);

// exports


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)();
// imports


// module
exports.push([module.i, ".column3{right:5px}.light{color:red;font-size:15px}", ""]);

// exports


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(8);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-0260b2f2!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./SongList.vue", function() {
			var newContent = require("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-0260b2f2!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./SongList.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(9);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-0e61ce9d!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./PlayingList.vue", function() {
			var newContent = require("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-0e61ce9d!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./PlayingList.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(10);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-367b7580!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Player.vue", function() {
			var newContent = require("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-367b7580!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Player.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(11);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-40a26998!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Song.vue", function() {
			var newContent = require("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-40a26998!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Song.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(12);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../node_modules/.0.26.1@css-loader/index.js!./../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-5564ad7a!./../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./App.vue", function() {
			var newContent = require("!!./../../node_modules/.0.26.1@css-loader/index.js!./../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-5564ad7a!./../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./App.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(13);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(1)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-db6b9c38!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Lry.vue", function() {
			var newContent = require("!!./../../../node_modules/.0.26.1@css-loader/index.js!./../../../node_modules/.10.0.2@vue-loader/lib/style-rewriter.js?id=data-v-db6b9c38!./../../../node_modules/.10.0.2@vue-loader/lib/selector.js?type=styles&index=0!./Lry.vue");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(19)

/* script */
__vue_exports__ = __webpack_require__(27)

/* template */
var __vue_template__ = __webpack_require__(39)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(16)

/* script */
__vue_exports__ = __webpack_require__(28)

/* template */
var __vue_template__ = __webpack_require__(35)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(15)

/* script */
__vue_exports__ = __webpack_require__(29)

/* template */
var __vue_template__ = __webpack_require__(34)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* script */
__vue_exports__ = __webpack_require__(30)

/* template */
var __vue_template__ = __webpack_require__(38)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(17)

/* script */
__vue_exports__ = __webpack_require__(31)

/* template */
var __vue_template__ = __webpack_require__(36)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

var __vue_exports__, __vue_options__
var __vue_styles__ = {}

/* styles */
__webpack_require__(14)

/* script */
__vue_exports__ = __webpack_require__(32)

/* template */
var __vue_template__ = __webpack_require__(33)
__vue_options__ = __vue_exports__ = __vue_exports__ || {}
if (
  typeof __vue_exports__.default === "object" ||
  typeof __vue_exports__.default === "function"
) {
__vue_options__ = __vue_exports__ = __vue_exports__.default
}
if (typeof __vue_options__ === "function") {
  __vue_options__ = __vue_options__.options
}

__vue_options__.render = __vue_template__.render
__vue_options__.staticRenderFns = __vue_template__.staticRenderFns

module.exports = __vue_exports__


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__components_SearchBox_vue__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__components_SearchBox_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__components_SearchBox_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_Player_vue__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__components_Player_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__components_Player_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_SongList_vue__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_SongList_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__components_SongList_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_PlayingList_vue__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_PlayingList_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3__components_PlayingList_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_Lry_vue__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_Lry_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__components_Lry_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__store_store__ = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//








/* harmony default export */ exports["default"] = {
    name:'appp',

    components:{
        SearchBox: __WEBPACK_IMPORTED_MODULE_0__components_SearchBox_vue___default.a,
        Player: __WEBPACK_IMPORTED_MODULE_1__components_Player_vue___default.a,
        SongList: __WEBPACK_IMPORTED_MODULE_2__components_SongList_vue___default.a,
        PlayingList: __WEBPACK_IMPORTED_MODULE_3__components_PlayingList_vue___default.a,
        Lry: __WEBPACK_IMPORTED_MODULE_4__components_Lry_vue___default.a
    },
    
    data(){
        return {
            playingId:null,   /* 正在播放的歌曲id */
            currentTime:-1
        }
    },
    methods:{
        changePlayId:function(id){  /* 修改播放音乐的id */
            this.playingId = id
            console.log('song id changed to:' + id)
        },
        nextSong:function(){
           let index = __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList.findIndex(p=>{
               return p.songid == this.playingId
           });               
           if(index >=0){
               /* 是不是最后一首歌曲 */
               this.playingId =  (index == __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList.length - 1) ? __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[0].songid:__WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[index+1].songid
           }else{
               this.playingId = __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[0].songid
           }
        },
        preSong:function(){
          let index = __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList.findIndex(p=>{
               return p.songid == this.playingId
           });               
           if(index >=0){
               /* 是不是第一首歌曲 */
               let len = __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList.length
               this.playingId =  (index == 0) ? __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[len-1].songid:__WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[index-1].songid
           }else{
                this.playingId = __WEBPACK_IMPORTED_MODULE_5__store_store__["a" /* default */].cache.playingList[0].songid
           }
        },
        updatetime:function(ct){
            this.currentTime = ct
        }
    }
};


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__apiProxy__ = __webpack_require__(3);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//


/* harmony default export */ exports["default"] = {
    name:'lry',
    props:['playingId','currentTime'],
    data(){
        return{
            lryArr:[],
            title:'',              
            currentIndex:-1
        }
    },
    watch:{
        currentTime(to,from){   
            let i = this.lryArr.findIndex(v=>v[0]>to)   
            if(i<0){
                return
            }
            if(!(i == 0 || i == this.lryArr.length - 1)){ /* 不是开头和结尾 */
                i = i - 1
            }
            if(i != this.currentIndex ){                              
                this.currentIndex = i   
                let cEl = lrcWrap.querySelector('[data-index="index-' + i + '"]');
                if(cEl !=null){ 
                    let offsetHeight = lrcWrap.offsetHeight,
                        offsetTop = cEl.offsetTop 
                    lrcWrap.scrollTop = offsetTop > offsetHeight ? offsetTop - offsetHeight/2.0 : offsetTop/2.0
                }
            }  
        },
        async playingId(to,from){
            lrcWrap.scrollTop = 0
            let lryObj = await __WEBPACK_IMPORTED_MODULE_0__apiProxy__["a" /* default */].lry(to) 
            this.title =  lryObj.title
            this.lryArr = lryObj.lrcContent.split('\n').map(v=>v.split(/\]/g).map((l,i)=>{
                return (i == 0 ? l.replace('[','') :l) /* ["00:00.33","海阔天空"] */
            })).map((v,index)=>{
                v[0] = v[0].split(':').reduce((pre,cur,i)=>{
                   return  (~~pre)*60 + +cur
                })
                return v
            })                                        
        }
    }       
};



/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__apiProxy__ = __webpack_require__(3);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//


      

/* harmony default export */ exports["default"] = {
    name:'player',
    props:['playingId'],
    data(){
        return {
            url:null,
            paused:true               
        }
    },
    computed:{
        songId(){
            return this.playingId
        }                      
    },
    methods:
    {
        ended:function(){
            console.log('ended song')
            this.$emit('playNextSong')
        }, 
        pre:function(){
            this.$emit('playPreSong')
        },
        next:function(){
            this.$emit('playNextSong')
        },
        togglePlay:function(){               
            this.paused = player.paused                
        },
        timeupdate:function(ev){
            this.$emit('timeupdate',player.currentTime)
        },
        outerPlay:function(){ 
            if(!this.playingId){
                return
            }            
            player.paused? player.play():player.pause()
            this.paused = player.paused 
        }
    },
    watch:{
        async songId(to,from){
            console.log('player got new songid:' + to)
            if(to !== from){
                let detail = await __WEBPACK_IMPORTED_MODULE_0__apiProxy__["a" /* default */].songDetail(to)
                player.src = '/api/song?fileLink=' + detail.bitrate['file_link']
                player.play()
            }
        }
    }
};


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__store_store__ = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//


/* harmony default export */ exports["default"] = {
    name:'playing-list',
    props:["pid"],
    data(){
        return {
           'list': __WEBPACK_IMPORTED_MODULE_0__store_store__["a" /* default */].cache.playingList               
        }
    },       
    methods:{
        changeId:function(ev){
            let el = ev.target               
            if(el.getAttribute("data-id") != null){
                this.$emit('changePlayId',el.getAttribute("data-id"))
            }
        },
        removeSong(ev){
            let el = ev.target
            if(el.getAttribute('data-id') != null){
                __WEBPACK_IMPORTED_MODULE_0__store_store__["a" /* default */].removeSong(el.getAttribute('data-id'))
            }
        },
        msenter(ev){
            let classList = ev.currentTarget.querySelector('.song-item').classList
            classList.add('show')
            classList.remove('hide')
        },
        msleave(ev){
            let classList = ev.currentTarget.querySelector('.song-item').classList
            classList.add('hide')
            classList.remove('show')
        }
    },
    computed:{
        pclass(){
            return 
        }
    }

};


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__store_store__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__apiProxy__ = __webpack_require__(3);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//





/* harmony default export */ exports["default"] = {
  name: 'search-box',  
  data() {
    return {
        keyWords:'海'
    }
  },
  computed: {   
  },
  methods: {   
     search:async function(ev){
         console.log('execute searching')
         let datas = await __WEBPACK_IMPORTED_MODULE_1__apiProxy__["a" /* default */].search(this.keyWords)      
         __WEBPACK_IMPORTED_MODULE_0__store_store__["a" /* default */].state.songs.splice(0,__WEBPACK_IMPORTED_MODULE_0__store_store__["a" /* default */].state.songs.length,...(datas.song||[]))
      }
  }
};


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__store_store__ = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//



/* harmony default export */ exports["default"] = {
    name:'song',
    props:['song'],
    methods:{
        addSong:function(ev){
            __WEBPACK_IMPORTED_MODULE_0__store_store__["a" /* default */].addSong(this.song)
        }
    }        
};


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Song_vue__ = __webpack_require__(24);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__Song_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__Song_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__store_store__ = __webpack_require__(2);
Object.defineProperty(exports, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//




console.log(__WEBPACK_IMPORTED_MODULE_1__store_store__["a" /* default */].state.songs)

/* harmony default export */ exports["default"] = {
    name:'song-list',
    components:{
        Song: __WEBPACK_IMPORTED_MODULE_0__Song_vue___default.a
    },
    data(){
        return{
            songs: __WEBPACK_IMPORTED_MODULE_1__store_store__["a" /* default */].state.songs
        }
    },
    methods:{
        changeId:function(ev){
            let el = ev.target
            if(el.getAttribute("data-id") != null){
                this.$emit('changePlayId',el.getAttribute("data-id"))
            }
        }
    }        
};



/***/ },
/* 33 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "tab-page reelList_922366 ui-reelList ui-widget ui-tabs-panel ui-widget-content ui-corner-bottom fullHeartShow list-temp",
    attrs: {
      "id": "page-song"
    }
  }, [_vm._m(0), _c('div', {
    staticClass: "ui-reelList-viewport"
  }, [(_vm.songs.length > 0) ? _c('div', {
    staticClass: "ui-reelList-canvas",
    on: {
      "click": _vm.changeId
    }
  }, _vm._l((_vm.songs), function(item) {
    return _c('song', {
      key: item.id,
      attrs: {
        "song": item
      }
    })
  })) : _c('div', {
    staticStyle: {
      "text-align": "center",
      "margin": "20px 0"
    }
  }, [_c('div', {
    staticClass: "text"
  }, [_vm._v("没有数据")])])])])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "ui-reelList-header ui-state-default",
    staticStyle: {
      "overflow": "hidden"
    }
  }, [_c('div', {
    staticClass: "ui-reelList-header-column c0",
    staticStyle: {
      "overflow": "hidden"
    }
  }, [_c('div', {
    staticClass: "ui-reelList-checkbox"
  }), _c('div', {
    staticClass: "sort-item",
    attrs: {
      "data-sortkey": "songName"
    }
  }, [_vm._v("歌曲"), _c('span', {
    staticClass: "sort-arrow-icon",
    staticStyle: {
      "display": "inline"
    }
  }), _c('ul', {
    staticClass: "ui-reelList-sort-box",
    staticStyle: {
      "display": "none"
    }
  }, [_c('li', {
    staticClass: "select",
    attrs: {
      "data-sortmethod": "default"
    }
  }, [_vm._v("默认")]), _c('li', {
    attrs: {
      "data-sortmethod": "increase"
    }
  }, [_vm._v("歌曲升序")]), _c('li', {
    attrs: {
      "data-sortmethod": "decrease"
    }
  }, [_vm._v("歌曲降序")])])])]), _c('div', {
    staticClass: "ui-reelList-header-column c1",
    staticStyle: {
      "overflow": "hidden"
    }
  }, [_c('div', {
    staticClass: "sort-item",
    attrs: {
      "data-sortkey": "artistName"
    }
  }, [_vm._v("歌手"), _c('span', {
    staticClass: "sort-arrow-icon",
    staticStyle: {
      "display": "inline"
    }
  }), _c('ul', {
    staticClass: "ui-reelList-sort-box",
    staticStyle: {
      "display": "none"
    }
  }, [_c('li', {
    staticClass: "select",
    attrs: {
      "data-sortmethod": "default"
    }
  }, [_vm._v("默认")]), _c('li', {
    attrs: {
      "data-sortmethod": "increase"
    }
  }, [_vm._v("歌手升序")]), _c('li', {
    attrs: {
      "data-sortmethod": "decrease"
    }
  }, [_vm._v("歌手降序")])])])]), _c('div', {
    staticClass: "ui-reelList-header-column c2",
    staticStyle: {
      "overflow": "hidden"
    }
  }, [_c('div', {
    staticClass: "sort-item",
    attrs: {
      "data-sortkey": "albumName"
    }
  }, [_vm._v("专辑"), _c('span', {
    staticClass: "sort-arrow-icon",
    staticStyle: {
      "display": "inline"
    }
  }), _c('ul', {
    staticClass: "ui-reelList-sort-box",
    staticStyle: {
      "display": "none"
    }
  }, [_c('li', {
    staticClass: "select",
    attrs: {
      "data-sortmethod": "default"
    }
  }, [_vm._v("默认")]), _c('li', {
    attrs: {
      "data-sortmethod": "increase"
    }
  }, [_vm._v("专辑升序")]), _c('li', {
    attrs: {
      "data-sortmethod": "decrease"
    }
  }, [_vm._v("专辑降序")])])])])])
}]}

/***/ },
/* 34 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', [_vm._m(0), _c('div', {
    staticClass: "playingList"
  }, [_c('ul', {
    on: {
      "click": _vm.changeId
    }
  }, _vm._l((_vm.list), function(item) {
    return _c('li', {
      key: item.songid,
      staticClass: "ui-lrc-sentence ui-lrc-prev",
      attrs: {
        "data-id": item.songid
      },
      on: {
        "mouseenter": function($event) {
          $event.stopPropagation();
          _vm.msenter($event)
        },
        "mouseleave": function($event) {
          $event.stopPropagation();
          _vm.msleave($event)
        }
      }
    }, [_c('a', {
      class: ['text', item.songid == _vm.pid ? 'playingItem' : ''],
      attrs: {
        "data-id": item.songid
      }
    }, [_vm._v(_vm._s(item.songname))]), _c('a', {
      class: ['song-item', 'hide'],
      attrs: {
        "data-id": item.songid,
        "href": "javascript:void(0)"
      },
      on: {
        "click": function($event) {
          $event.stopPropagation();
          _vm.removeSong($event)
        }
      }
    }, [_vm._v("x")])])
  }))])])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "list list-temp ui-droppable playing",
    attrs: {
      "id": "list_temp"
    }
  }, [_c('a', {
    staticClass: "icon column1-icon list-temp-icon",
    attrs: {
      "hidefocus": "true"
    }
  }), _c('a', {
    staticClass: "text"
  }, [_vm._v("收藏列表")]), _c('a', {
    staticClass: "column1-icon listening-icon listen-icon-playing",
    attrs: {
      "hidefocus": "true"
    }
  })])
}]}

/***/ },
/* 35 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "mb-layout-ft minwidth",
    attrs: {
      "onselectstart": "return false;",
      "alog-alias": "mbox-play-ctrl",
      "monkey": "mbox-play-ctrl"
    }
  }, [_c('div', {
    staticClass: "panel",
    attrs: {
      "id": "playPanel"
    }
  }, [_c('div', {
    staticClass: "panel-inner"
  }, [_c('div', {
    staticClass: "left-panel",
    attrs: {
      "id": "leftPanel"
    }
  }, [_c('ul', {
    staticClass: "play-btn"
  }, [_c('li', {
    staticClass: "prev",
    on: {
      "click": _vm.pre
    }
  }, [_vm._m(0)]), _c('li', {
    class: ['play wg-button', _vm.paused ? 'stop' : ''],
    attrs: {
      "title": "暂停"
    },
    on: {
      "click": _vm.outerPlay
    }
  }, [_vm._m(1)]), _c('li', {
    staticClass: "next",
    on: {
      "click": _vm.next
    }
  }, [_vm._m(2)])])]), _c('div', {
    staticClass: "main-panel"
  }, [_c('div', {
    staticClass: "pane"
  }, [_c('audio', {
    attrs: {
      "id": "player",
      "controls": "",
      "data-id": _vm.playingId
    },
    on: {
      "timeupdate": _vm.timeupdate,
      "ended": _vm.ended,
      "pause": _vm.togglePlay,
      "play": _vm.togglePlay
    }
  })])]), _vm._m(3)])])])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('a', {
    staticClass: "wg-button",
    attrs: {
      "hidefocus": "true",
      "title": "上一首[←]"
    }
  }, [_c('span', {
    staticClass: "wg-button-inner"
  })])
},function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('span', {
    staticClass: "wg-button-inner"
  }, [_c('a', {
    attrs: {
      "hidefocus": "true"
    }
  })])
},function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('a', {
    staticClass: "wg-button",
    attrs: {
      "hidefocus": "true",
      "title": "下一首[→]"
    }
  }, [_c('span', {
    staticClass: "wg-button-inner"
  })])
},function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "right-panel"
  }, [_c('a', {
    staticClass: "switch-fm-btn",
    attrs: {
      "href": "javascript:;",
      "id": "switchFm",
      "title": "随便听听"
    }
  }, [_c('i', {
    staticClass: "icon-ting"
  }), _c('span', [_vm._v("随心听")])])])
}]}

/***/ },
/* 36 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "ui-widget-content ui-reelList-row emptyHeart even",
    staticStyle: {
      "top": "0px"
    },
    attrs: {
      "reellist-row": "0"
    }
  }, [_c('div', {
    staticClass: "ui-reelList-cell  c0"
  }, [_vm._m(0), _c('span', {
    staticClass: "listening-icon"
  }), _c('span', {
    staticClass: "similar-icon cur-similar"
  }), _c('span', {
    staticClass: "ui-reelList-songname"
  }, [_c('span', {
    staticClass: "songname-txt"
  }, [_vm._v(_vm._s(_vm.song.songname))])])]), _c('div', {
    staticClass: "ui-reelList-cell  c1"
  }, [_c('a', {
    staticClass: "a-link"
  }, [_vm._v(_vm._s(_vm.song.artistname))])]), _c('div', {
    staticClass: "ui-reelList-cell  c2"
  }, [_vm._v("《"), _c('a', {
    staticClass: "a-link"
  }, [_vm._v(_vm._s(_vm.song.album))]), _vm._v("》")]), _c('div', {
    staticClass: "ui-reelList-cell  c3",
    staticStyle: {
      "width": "auto"
    }
  }, [_c('span', {
    attrs: {
      "data-id": _vm.song.songid
    },
    on: {
      "click": _vm.addSong
    }
  }, [_vm._v("+")]), _c('span', {
    attrs: {
      "data-id": _vm.song.songid
    }
  }, [_vm._v(">>")])])])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "ui-reelList-checkbox"
  }, [_c('span')])
}]}

/***/ },
/* 37 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', [_c('search-box'), _c('div', {
    staticClass: "default-main",
    attrs: {
      "id": "mainContent"
    }
  }, [_c('div', {
    staticClass: "main-wrapper"
  }, [_c('div', {
    staticClass: "mb-layout-bd column1",
    attrs: {
      "id": "leftCol"
    }
  }, [_c('div', {
    staticClass: "leftbar-bottom-bg"
  }, [_c('div', {
    staticClass: "leftbar-outer"
  }, [_c('div', {
    staticClass: "leftbar"
  }, [_c('playing-list', {
    attrs: {
      "pid": _vm.playingId
    },
    on: {
      "changePlayId": _vm.changePlayId
    }
  })])])])]), _c('div', {
    staticClass: "mb-layout-bd column2"
  }, [_c('div', {
    staticClass: "tab-main ui-tabs ui-widget ui-widget-content ui-corner-all",
    attrs: {
      "id": "tab"
    }
  }, [_c('div', {
    staticClass: "tab-content cfix"
  }, [_c('song-list', {
    on: {
      "changePlayId": _vm.changePlayId
    }
  })])])]), _c('lry', {
    attrs: {
      "playingId": _vm.playingId,
      "currentTime": _vm.currentTime
    }
  })])]), _c('player', {
    attrs: {
      "playingId": _vm.playingId
    },
    on: {
      "timeupdate": _vm.updatetime,
      "playNextSong": _vm.nextSong,
      "playPreSong": _vm.preSong
    }
  })])
},staticRenderFns: []}

/***/ },
/* 38 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "mb-layout-hd cmb-comm",
    attrs: {
      "alog-alias": "mbox-header",
      "monkey": "mbox-header"
    }
  }, [_c('div', {
    staticClass: "top-banner"
  }, [_c('div', {
    staticStyle: {
      "left": "556px"
    },
    attrs: {
      "id": "searchBar"
    }
  }, [_c('div', {
    attrs: {
      "action": "search"
    }
  }, [_c('span', {
    staticClass: "ui-watermark-container ui-watermark-input"
  }, [_c('input', {
    directives: [{
      name: "model",
      rawName: "v-model",
      value: (_vm.keyWords),
      expression: "keyWords"
    }],
    staticClass: "sug-input",
    attrs: {
      "type": "text",
      "placeholder": "输入歌曲、歌手、专辑名",
      "size": "24",
      "autocomplete": "off",
      "name": "key",
      "id": "search-sug-input"
    },
    domProps: {
      "value": _vm._s(_vm.keyWords)
    },
    on: {
      "keyup": function($event) {
        if (_vm._k($event.keyCode, "enter", 13)) { return; }
        _vm.search($event)
      },
      "input": function($event) {
        if ($event.target.composing) { return; }
        _vm.keyWords = $event.target.value
      }
    }
  })]), _c('input', {
    attrs: {
      "type": "button",
      "id": "search-sug-submit",
      "value": ""
    },
    on: {
      "click": _vm.search
    }
  }), _vm._m(0)])])])])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "sug-result",
    staticStyle: {
      "display": "none"
    }
  }, [_c('p', {
    staticClass: "sug-source sug-quku"
  }, [_vm._v("曲库搜索")]), _c('dl', {
    staticClass: "sug-artist clearfix"
  }, [_c('dt', {
    staticClass: "sug-title clearfix"
  }, [_vm._v("歌手")])]), _c('dl', {
    staticClass: "sug-song clearfix"
  }, [_c('dt', {
    staticClass: "sug-title clearfix"
  }, [_vm._v("歌曲")])]), _c('dl', {
    staticClass: "sug-album clearfix"
  }, [_c('dt', {
    staticClass: "sug-title clearfix"
  }, [_vm._v("专辑")])])])
}]}

/***/ },
/* 39 */
/***/ function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "mb-layout-bd column3",
    attrs: {
      "id": "lrcCol"
    }
  }, [_vm._m(0), _c('div', {
    staticClass: "lrc-wrapper ui-lrc ui-lrc-vertical lrc",
    staticStyle: {
      "bottom": "50px"
    },
    attrs: {
      "id": "lrcWrap"
    }
  }, [((_vm.lryArr || []).length > 0) ? _c('ul', [_c('li', [_vm._v("当前时间" + _vm._s(_vm.currentTime))]), _vm._l((_vm.lryArr), function(item, index) {
    return _c('li', {
      class: _vm.currentIndex == index ? 'light' : '',
      attrs: {
        "item": item,
        "data-index": 'index-' + index
      }
    }, [_vm._v("\n                " + _vm._s(item[1]) + "\n            ")])
  })], true) : _c('div', {
    staticClass: "no-lrc"
  }, [_c('div'), _c('span', {
    staticClass: "no-lrc-hint"
  }, [_vm._v("该歌曲暂时没有歌词"), _c('a', {
    attrs: {
      "href": "javascript:;",
      "id": "requestLrc"
    }
  }, [_vm._v("求歌词")])]), _c('span', {
    staticClass: "send-lrc-request"
  }, [_vm._v("已经告诉ta啦")])])]), _vm._m(1)])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "album-wrapper"
  }, [_c('a', {
    staticClass: "log",
    attrs: {
      "target": "_blank",
      "href": ""
    }
  }, [_c('img', {
    attrs: {
      "width": "180",
      "height": "180",
      "src": ""
    }
  })]), _c('div', {
    staticClass: "album-name"
  }, [_c('a', {
    staticClass: "log",
    attrs: {
      "target": "_blank",
      "href": ""
    }
  }, [_vm._v("《》")]), _c('span', {
    staticClass: "icon"
  })])])
},function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._c;
  return _c('div', {
    staticClass: "ui-resizable",
    attrs: {
      "id": "lrcResize"
    }
  }, [_c('div', {
    staticClass: "resizable-icon",
    attrs: {
      "id": "widResize"
    }
  })])
}]}

/***/ },
/* 40 */,
/* 41 */
/***/ function(module, exports, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_vue__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__App_vue__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__App_vue___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__App_vue__);



// create the app instance.
// here we inject the router and store to all child components,
// making them available everywhere as `this.$router` and `this.$store`.
const app = new __WEBPACK_IMPORTED_MODULE_0_vue___default.a(__WEBPACK_IMPORTED_MODULE_0_vue___default.a.util.extend({ 
}, __WEBPACK_IMPORTED_MODULE_1__App_vue___default.a))

app.$mount('#app')

fetch('/api/search/%E6%B5%B7').then(response=>response.json()).then((data)=>console.log(data))


/***/ }
],[41]);
//# sourceMappingURL=app.js.map