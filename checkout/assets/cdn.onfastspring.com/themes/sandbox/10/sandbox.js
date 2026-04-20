(function() {
    'use strict';

    // This requires the 'raven' script to be included & initialized from the theme before this script!
    // https://d1f8f9xcsvx3ha.cloudfront.net/libs/sentry/3.3.0/angular/raven.min.js

    var logger = {
        themeVersion: document.querySelector('#viewBranch') && document.querySelector('#viewBranch').getAttribute('content'),
        info: function() {
            logger._log('info', Array.prototype.slice.call(arguments));
        },
        warn: function() {
            logger._log('warning', Array.prototype.slice.call(arguments));
        },
        error: function() {
            logger._log('error', Array.prototype.slice.call(arguments));
        },
        _log: function __log(type, args) {
            var message = args.shift();
            return;
        }
    };

    var sandboxBase = null;
    var sandbox = null;



    // set sessionID
    var sessionID = 'no-session-id';
    try {
        var viewdata = document.getElementById('viewdata');
        if (viewdata) {
            viewdata = JSON.parse(viewdata.innerHTML);
            sessionID = viewdata.session.token;
        }
    } catch (e) {}

    function writeQueryStringToLocalStorageAndGet(queryString) {
        var queryString = window.location.search ? window.location.search : '';

        //rewrite query string without GA
        if (queryString.length > 0) {
            var tempQueryString = queryString.substring(1).split('&');
            var queryFields = [];

            for (var i = 0; i < tempQueryString.length; i++) {
                if (!/^_ga[a-z]*=/.test(tempQueryString[i])) {
                    queryFields.push(tempQueryString[i]);
                }
            }
            tempQueryString = '?' + queryFields.join('&');

            // save tempQueryString to localStorage
            try {
                if (window.localStorage.getItem('tempQueryString') !== tempQueryString) {
                    window.localStorage.setItem('tempQueryString', tempQueryString);
                }
            } catch (e) {}
        } else {
            // read tempQueryString from localStorage
            try {
                tempQueryString = window.localStorage.getItem('tempQueryString') || '';
                if (tempQueryString.length > 1) {
                    queryString = tempQueryString;
                }
            } catch (e) {}
        }

        return queryString;
    }


    //GA3 use removed, leaving here for now
    function getUrlWithGA(hashtagString, queryString, url) {
        if (hashtagString) {
            hashtagString = hashtagString.replace(/^#\//, '#');
        }
        return (url + queryString + hashtagString);
    }

    // checks if query string is empty, appends param to it
    function appendParamOrCreateQueryString(queryString, param) {
        if (param && queryString) {
            queryString += '&' + param;
        } else if (param) {
            queryString = '?' + param;
        } else if (!queryString) {
            queryString = "";
        }

        return queryString;
    }


    function turnQueryStringIntoQueryHash(queryString){
        var queryHash = {};

        // check if the queryString exists
        if (queryString) {
          // separate into hash : elegant solution found here: https://stevenbenner.com/2010/03/javascript-regex-trick-parse-a-query-string-into-an-object/
          queryString.replace(
              new RegExp("([^?=&]+)(=([^&]*))?", "g"),
              function ($0, $1, $2, $3) {
                queryHash[$1] = $3;
              }
          );
        }
        return queryHash;
    }

    function addParamToQueryString(queryString, param) {
        if (queryString && param) {
            return queryString += '&' + param;
        } else if (queryString) {
            return queryString;
        } else if (param) {
            return param;
        } else {
            return "";
        }
    }

    // keeping the method because it is used by checkout.js in themes as global function
    function appendGAtoQueryString(queryString) {
        return queryString;
    }

    // create and initialize sandbox. This is called from the main app js file when the app is loaded.
    function initSandbox(url) {
        var queryString = writeQueryStringToLocalStorageAndGet();
        var hashtagString = window.location.hash ? window.location.hash : '';
        var src;

        sandbox = document.createElement('iframe');
        sandbox.id = 'sandbox';
        sandbox.width = '0';
        sandbox.height = '0';
        sandbox.frameBorder = 0;

        window.setTimeout(function() {
            src = getUrlWithGA(hashtagString, queryString, url);

            sandboxBase = url;

            //Append sessionID
            src += (~src.indexOf('?') ? '&' : '?') + ('sid=' + encodeURIComponent(sessionID));

            debug( "Setting sandbox URL to:", src);

            sandbox.setAttribute("src", src);

            // wait for the sandbox to really load after it was appended and _init
            sandbox.onload = function() {
                helloSandbox();
            };

            document.body.appendChild(sandbox);
        }, 500);
    }

    function helloSandbox() {
        // this is called when we are sure that sandbox is loaded
        var data = {
            '_init': {
                'vendor': window.vendor,
                'storefront': window.storefront,
                'style': window.style,
                'theme': window.theme,
                'live': String(window.live),
                'fsc-url': window.location.href,
                'fsc-referrer': document.referrer
            }
        };

        if (window.currentProduct && window.currentProduct.length > 0) {
            data['_init'].product = window.currentProduct;
        }

        analyze(data, true); // analyze is the function which is called on each event.

        // this function MUST be declared in the original app .js:
        // it is called from here when we a) loaded sandbox and
        // b) initialized sandbox so we are sure it's ready to accept data
        window.trackInitialPageView();
    }

    function analyze(message) {
        if (typeof analyze.q === 'undefined') {
            analyze.q = [];
            analyze.c = 0;
        }

        var sandboxReady;
        var initialCall = arguments[1];

        try {
            sandboxReady = sandbox && sandbox.contentWindow.postMessage;
        } catch(e) {
            sandboxReady = false;
        }

        try {
            clearTimeout(analyze.t);

            if (message) {
                initialCall ? analyze.q.unshift(message) : analyze.q.push(message);
            }

            if (sandboxReady) {
                while (analyze.q.length > 0) {
                    sandbox.contentWindow.postMessage(analyze.q.shift(), '*');
                }
            } else {
                if (++analyze.c === 10) {
                    logger.error('Waited 10 seconds for sandbox to load');
                } else {
                    analyze.t = setTimeout(analyze, 1000); //try to send messages again in a second
                }
            }
        } catch (e) {
            logMessage({
                'primary': window.vendor,
                'secondary': window.storefront,
                'action': 'Sandbox:analyze:Exception',
                'url': window.location.href,
                'error': e.message
            });
            logger.error('Failed to call sandbox', {initialCall: initialCall}, e);
        }
    }

    window.initSandbox = initSandbox;
    window.analyze = analyze;
    window.appendGAtoQueryString = appendGAtoQueryString;
})();
