// inlining for prformance reasons. Will be centralized later as part of perf work
let fsErrorBuffer = [];
let TURNSTILE_TOKEN = 'turnstileToken';
try {
  function captureError(message, source, lineno, colno, error) {
    try { // need another try, since callback
      if (!error || !(error instanceof Error)) {
        error = new Error(message);
        if (!error.stack) {
          error.stack = `Generated at ${source}:${lineno}:${colno}`;
        }
      }
      if (!error.fileName) error.fileName = source;
      if (!error.lineNumber) error.lineNumber = lineno;
      if (!error.columnNumber) error.columnNumber = colno;
      const signature = `${error.name}|${error.message}|${error.fileName}:${error.lineNumber}:${error.columnNumber}|${error.stack}`;
      if (!fsErrorBuffer.some(e => e.signature === signature)) {
        fsErrorBuffer.push({ signature, errorObject: error });
      }
    } catch (err) {
      console.error("Error inside captureError:", err);
    }
  }
  function fsOnErrorHandler(event) {
    try {
      captureError(event.message, event.filename, event.lineno, event.colno, event.error);
    } catch (err) {
      console.error("Error in fsOnErrorHandler:", err);
    }
  }
  function fsOnUnhandledRejectionHandler(event) {
    try {
      // Ensure event.reason is a valid error object
      let error = event.reason instanceof Error ? event.reason : new Error(event.reason || "Unhandled promise rejection");
      captureError(error.message, "", 0, 0, error);
    } catch (err) {
      console.error("Error in fsOnUnhandledRejectionHandler:", err);
    }
  }
  window.addEventListener("error", fsOnErrorHandler);
  window.addEventListener("unhandledrejection", fsOnUnhandledRejectionHandler);
} catch (err) {
  console.error("Error in error-handling script:", err);
}

function removeServerValidationByField(validationsArray, fieldName) {
    if (!Array.isArray(validationsArray) || !fieldName) return false;

    var removed = false;
    // Iterate backwards to safely splice from the array while iterating
    for (var i = validationsArray.length - 1; i >= 0; i--) {
        if (validationsArray[i] && validationsArray[i].field === fieldName) {
            validationsArray.splice(i, 1);
            // console.log("Removed server validation for field: " + fieldName);
            removed = true;
        }
    }
    return removed;
}

try {
(function() {
  'use strict';
  /* in-lining needed parts from core.js for performance */
  (function () {
    try {
      if (window.location.hash) {
        var action = window.location.hash.substring(1);
        try {
          if (action == 'debug-on') {
            window.localStorage.setItem('debug', true);
          } else if (action == 'debug-off') {
            window.localStorage.removeItem('debug');
          }
        } catch (e) { }
      }
      window.logMessage = window.debug = function _debug() {
        try {
          if (window.localStorage.getItem('debug')) {
            console.log.apply(console, arguments);
          }
        } catch (e) { }
      };
    } catch (ignoreErrorsWhileDebugging) { }
  })();

  function lookupAngularVar(scope, propName) {
    var hops = 0
    while (scope && hops++ < 100) {
      if (propName in scope) {
        return scope[propName];
      }
      scope = scope.$parent;
    }
    return undefined;
  }
  angular.module('creditCard', []);

  var fscGlobal = {};
  //directive which adds spaces to user input through parserFunction
  //and detects credit card type
  angular.module('creditCard').directive('creditCardInput', function(cc) {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ctrl) {
        var el = element[0];
        var divider = ' ';

        function noSpaces(value) {
          if (value) {
            return value.replace(/ /g, '');
          }
        }

        function formatInput(value) {
          return value.match(/\d{1,4}/g).join(divider);
        }

        //runs when input field is updated
        function parserFunction(value) {
          if (value) {
            var noSpace = noSpaces(value);
            var spaced = formatInput(noSpace); //first clear spaces and then add - prevent spaces duplication

            // Avoid infinite loop of $setViewValue <-> $parsers
            if (value === spaced) return noSpace;

            //how many dividers WERE in input - BEFORE our input last element
            var dividersBefore = (value.slice(0, el.selectionStart).split(divider)).length - 1;
            //how many dividers ADDED to the input - BEFORE our input last element
            var dividersAfter = (spaced.slice(0, el.selectionStart + 1).split(divider)).length - 1; //will always return array of at least 1
            var dividerDiff = dividersAfter - dividersBefore;

            var pos = el.selectionStart + dividerDiff; //selection start

            ctrl.$setViewValue(spaced);
            ctrl.$render();

            el.setSelectionRange(pos, pos); //set coursor back to it's position- avoid jumping to the end of input
            return noSpace;
          }
        }
        function cardType(number) {
          cc.type = '';
          if (!number) {
            return;
          }
          var cards = {
            unionpay: /((^62)(?!(212[6-9]|21[3-9][0-9]|2[2-8][0-9]{2}|29[0-1][0-9]|292[0-5]|[4-6][0-9]{3}|8[2-8][0-9][0-9])))\d{4,6}/, //UnionPay card numbers begin with 62 that is not in range of discover card (recognizes within 6 numbers)
            visa: /^4/, //Visa card numbers start with a 4. (recongizes within 1 number)
            //MasterCard numbers start with the numbers 51 through 55,
            //Or MasterCard numbers start with 2221 through 2720
            // ((2(2[1-9]|[3-9][0-9]))  - for 221-229  and  230-299
            // (([3-6][0-9][0-9]))      - for 300-699
            // (7(([01][0-9])|(20))))   - for 700-720
            mastercard: /^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/, //(recognizes within 4 numbers)
            amex: /^(34|37)/, //American Express card numbers start with 34 or 37. (recognizes within 2 numbers)
            diners: /^(36|38|39|30[0-5]|3095)/, // begin with 300 through 305, 36 or 38. (recognized within 2-4 numbers)
            hipercard: /^384100|^384140|^384160|^606282|^637095|^637568|^637599|^637609|^637612/,
            discover: /^65|^64|^6011|((^62)(212[6-9]|21[3-9][0-9]|2[2-8][0-9]{2}|29[0-1][0-9]|292[0-5]|[4-6][0-9]{3}|8[2-8][0-9][0-9]))/, //Discover card numbers begin with 6011, 622126 - 622925, 624000 - 626999, 628200 - 628899, 64, or 65. (recognized within 6 numbers)
            // The DiscoverCard regex above is not accurate enough to differentiate between discover and elo. So make sure that elo is after discover so that any erroneous discover match can be replaced correctly by elo.
            elo: /^((451416)|(457393)|(504175)|(506)(699|7[0-6][0-9]|77[0-8])|(509)[0-9][0-9][0-9]|(627780)|(636297)|(63636[8-9])|(6500)(3[1-3]|3[5-9]|4[0-9]|5[0-1]|5[8-9]|69|7([0-1]|[7-8]))|(6504)(0[5-9]|1[0-9]|2[0-9]|3[0-9])|(650)(4(8[5-9]|9[0-9])|5([0-2][0-9]|3[0-8]))|(6505)(4[1-9]|[5-8][0-9]|9[0-8])|(6507)(0[0-9]|1[0-8])|(65072)[0-7]|(6509)(0[1-9]|[1-6][0-9]|7[0-8])|(6516)(5[2-9]|[6-7][0-9]|88)|(6550)([0-1][0-9])|(6550)(2[1-9]|[3-4][0-9]|5[0-8]))/,
            jcb: /^(352[89]|35[3-8][0-9])/ //JCB cards begin with 2131, 1800 or 35. (recognized within 4 numbers)
          };
          for (var card in cards) {
            if (cards.hasOwnProperty(card)) {
              if (cards[card].test(number)) {
                cc.type = card;
              }
            }
          }
          return number;
        }

        ctrl.$parsers.push(parserFunction);

        if (attrs.creditCardType) {
          ctrl.$parsers.push(cardType);
        }

      }
    };
  });

  //allows to access cc.type in any directive
  angular.module('creditCard').value('cc', { type: '' });

  // Auto-populated
  var _variables = {"themeModeJS":"","allowSeparateBillingContactInfo":"false","integrationBehaviourGA":"doNotRun","whichLogoTitle":"store","collectingEmailCheckbox":"hide","placeLogo":"overflow","actionLinksClrHover":"#c8661a","returningCustomerPaymentMethod":"visible","showCouponField":"false","subscriptionTermsExpose":"disabled","subscriptionAutoRenewAfterInit":"auto","paymentMethodStyleJS":"logoWithLabel","accordionAnimationSpeed":".7s","focusVisiblePrice":"false","forcePhoneNumberCollection":"false","imageMode":"light","couponFieldExpanded":"link","borderRadiusButton":"4px","responsiveCart":"false","showCompanyField":"disable","subscriptionAutoRenew":"auto","showVatLink":"false","forcePhysicalAddressCollection":"false","actionLinksClr":"#f38027","modalExpand":"false","labelDisplayModePopup":"default","labelDisplayModeInline":"default","customIdGTM":"","countrySelector":"hidden","showProducts":"false","integrationBehaviourGTM":"doNotRun","openFooterLinkInOverlay":"false","licenses":"false","customIdGA":"","requireEmail":"false","accordionCornerRadius":"6px","showCart":"true","payButtonHeight":"42px","font":"Helvetica-Neue"};

  window.dataLayer = [];
  window.initiated = false;
  window.storefront = null;
  window.vendor = null;
  window.theme = null;
  window.style = null;
  window.live = null;
  window.currentProduct = null;
  window.urlOverride = null;

  window.s1s = false;
  window.s2s = false;
  window.s3s = false;
  window.s4s = false;
  window.s5s = false;

  var zeroWidthCounter = 1; // inside IIFE, function scope
  var screenReaderValidationDebouncer = null;

  // Screen reader messages start - no l10n for Screen Reader messages (dated 2021)
  var INVALID_FIELDS_MESSAGE = 'The following are the invalid fields';
  var INVALID_FIELD_MESSAGE = 'The following is the invalid field';
  var INVALID_FORM_MESSAGE = 'Form validation failed. ';
  var STRING_INVALID = 'Invalid';
  var STRING_FOCUS = 'The focus is on the first invalid field, ';
  var COUNTRY_CODES = {'US': 'US', 'CANANDA': 'CA'};
  var SCREEN_READER_FIELD_NAMES = {'security': 'CVC', 'addressline1': 'address',
    'postalCode': 'postal code', 'region' : 'region', 'firstName': 'first name', 'lastName': 'last name',
    'phoneNumber': 'phone number', 'addressLine1': 'address', 'accountNum': 'account number', 'routingNum': 'routing number',
    'confirmAccountNumber': 'account number confirmation'};
  var USE_ERROR_FIELD_NAMES = false;
  // Screen reader messages end

  var sblMessageCount = 0;
  var sblMessageMaxCount = 500; // just a guard rail, in case of some rogue hack/error causing a loop.
  var IN_PROGRESS = 'IN_PROGRESS';

  var imageCDN = 'https://cdn.onfastspring.com/themes/images/';
  let APPLE_PAY = 'applepay';
  let GOOGLE_PAY = 'googlepay';
  let PIX_PAYMENT_METHOD = 'pix';
  const APPLE_PAY_EVENT_TYPE = "ApplePay"
  const SHOW_OTHER_PAYMENT_METHODS = "other";

  function isIE() {
    var myNav = navigator.userAgent.toLowerCase();
    var trident = myNav.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10) == 11;
    } else {
      //IE 11 and lower
        return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1], 10) : false;
    }
  }

  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var isiOSMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function setPlaceHolders() {
    var input = document.getElementsByTagName('input'); // get all text fields
    var cls = "placeholdr"; // set name of the class

    if (input) { // if fields found
      for (var i = 0; i < input.length; i++) {
        var t = input[i];
        var txt = t.getAttribute("placeholder");

        if (txt && txt.length > 0) { // if placeholder found
          t.className = t.value.length === 0 ? t.className + " " + cls : t.className; // add class
          t.value = t.value.length > 0 ? t.value : txt; // if no value found

          t.onfocus = function() { // on focus
            this.className = this.className.replace(cls);
            this.value = this.value == this.getAttribute("placeholder") ? "" : this.value;
          };

          t.onblur = function() { // on focus out
            if (this.value.length === 0) {
              this.value = this.getAttribute("placeholder");
              this.className = this.className + " " + cls; // add class
            }
          };
        }
      }
    }
  }

  function startUpdate() {
    angular.element(document.getElementById('app')).addClass('updating');
  }

  function endUpdate() {
    angular.element(document.getElementById('app')).removeClass('updating');
  }

  function createItemsArray(groups) {
    function addItem(list, item, type) {
      if (item.selected) {
        if (item.subscription) {
          list.push(item);
          orderSubscriptions.push(item);
          if(item.subscription.intervalUnit == "adhoc") {
            orderSubscriptionsAdhocCount += 1;
          }
        } else if (type == 'setup-fee'){
          // Setup fee item should be right below first (driver) item
          list.splice(1, 0, item);
        } else {
          list.push(item);
        }
      }
    }
    var orderSubscriptions = [];
    var orderItems = [];
    var orderSubscriptionsAdhocCount = 0;

    groups.forEach(function(group) {
        group.items.forEach(function(item){
          var list = [];
          addItem(list, item, group.type);
          if (item.groups) {
            item.groups.forEach(function (subGroup) { // go one more level deep for potential addons
              subGroup.items.forEach(function (subItem) {
                addItem(list, subItem, subGroup.type);
              });
            });
          }
          orderItems = orderItems.concat(list);
        });
    });
    return {
        orderSubscriptions: orderSubscriptions,
        orderItems: orderItems,
        orderSubscriptionsAdhocCount: orderSubscriptionsAdhocCount
    }
  }

  var fsApp = angular.module("app", ['ngSanitize', 'nsPopover', 'ui.bootstrap', 'app.controllers', 'creditCard']);

  fsApp.factory('initData', viewDataFactory);
  function viewDataFactory() {
    if (viewDataFactory.data) {
      return viewDataFactory.data;
    }
    var data = document.getElementById('viewdata');
    data = data && angular.fromJson(angular.element(data).text());
    if (!viewDataFactory.data) {
      viewDataFactory.data = data;
    }
    return data;
  }

  fsApp.factory('env', function() {
    return {
      'lastSessionToken': '',
      'lastSessionUrl': '',
      'phrases': {}
    };
  });

  fsApp.factory('subscriptions', function($filter) {
    //this function pluralizes given unit in english and returns its localized value from messages file
    function pluralize(length, unit) {
      if (length == 1) {
        return $filter('phrase')(unit);
      } else if (length > 1) {
        return $filter('phrase')(unit + 's');
      }
    }

    function isToday(value, displayValue) {
      var dateReceived = new Date(value);
      if (dateReceived.toDateString() === (new Date()).toDateString()) {
        return $filter('phrase')('Today')
      } else {
        return displayValue;
      }
    };

    return {
        pluralize: pluralize,
        isToday: isToday
    };
});

//Receive message
fsApp.factory('$receiveMessage', function() {
    function receiveMessage(event) {
      if (!event || typeof event.data === 'undefined' || event.data === null) return;

      var data = event.data;
      var scope = this.scope;
      var $timeout = this.timeout;

      debug("Foundation $receiveMessage", event);

      if (!data.hasOwnProperty('fastSpringInternalEvent') || !data.fastSpringInternalEvent.hasOwnProperty('type') ||
        data.fastSpringInternalEvent.type === null || typeof data.fastSpringInternalEvent.type === 'undefined') return;

      if(data.fastSpringInternalEvent.type === 'redirect_3ds') {
        if (data.fastSpringInternalEvent.success) {
          scope.$broadcast('redirect_3ds_success', data.fastSpringInternalEvent.redirectPage);
        } else {
          scope.$broadcast('redirect_3ds_failure', data.fastSpringInternalEvent);
        }
      }

      if(data.fastSpringInternalEvent.type === 'redirect_sepa') {
        scope.$broadcast('redirect_sepa_success', data.fastSpringInternalEvent.redirectPage);
      }

      if(data.fastSpringInternalEvent.type === 'error_sepa') {
        scope.$broadcast('close_widget_dialog');

        scope.choosePaymentOption(true, null, true);

        $timeout(function() {
          scope.$broadcast('error_sepa_bank_login');
        });
      }

      if (data.fastSpringInternalEvent.type === 'sheeridToken' && data.fastSpringInternalEvent.token !== null && typeof data.fastSpringInternalEvent.token !== 'undefined') {
        handleSheeridToken(data.fastSpringInternalEvent.token, scope);
      } else if (data.fastSpringInternalEvent.type === 'paymentRedirect' && data.fastSpringInternalEvent.location !== null && typeof data.fastSpringInternalEvent.location !== 'undefined') {
        handlePaymentRedirect(data.fastSpringInternalEvent.location, data.fastSpringInternalEvent.target, scope);
      }
    }

    function handleSheeridToken(token, scope) {
      debug('Foundation', token);

      scope.http('POST', '/spi/sheerid', {
        token: token
      }, function(result) {
        scope.refreshOrderResponse(result);
        debug('Pinhole handleSheeridToken', JSON.stringify(result));
        scope.discountDialog.dismiss('cancel');
      });

    }

    function handlePaymentRedirect(location, target, scope) {
      var redirect;
      var firstSym = location.slice(0, 1);

      if (firstSym === '/') {
        redirect = window.location.origin + location;
      } else {
        redirect = window.location.origin + '/' + location;
      }

      window.removeEventListener('unload', scope.popupClose);

      if ('top' === target) {
        top.location.href = redirect;
      } else {
        window.location.href = redirect;
      }
    }

    return receiveMessage;
  });

// Keep panel content mounted while closing. Remove it after transition ends
fsApp.directive('pmDeferTeardown', function() {
  return {
    restrict: 'A',
    link: function(scope, el, attrs) {
      const isOpenExpr = attrs.pmDeferTeardown;
      const key = attrs.key || attrs.dataKey;
      scope.closing = scope.closing || {};
      let wasOpen = false;

      function onEnd(e) {
        if (e.propertyName === 'grid-template-rows') {
          el[0].removeEventListener('transitionend', onEnd);
          scope.$apply(() => { scope.closing[key] = false; });
        }
      }

      scope.$watch(isOpenExpr, function(isOpen) {
        if (isOpen) {
          wasOpen = true;
          scope.closing[key] = false;
        } else if (wasOpen) {
          // start closing: keep DOM until animation finishes
          scope.closing[key] = true;
          el[0].addEventListener('transitionend', onEnd);
          wasOpen = false;
        }
      });
    }
  };
});
fsApp.directive('subscriptionSummary', function() {
    return {
        restrict: 'A',
        scope: {
            subscription: '=',
            item: '='
        },
        templateUrl: 'subscription-summary.html',
        controller: function($scope, $filter, subscriptions) {
            var lastInstruction = $scope.subscription.instructions[$scope.subscription.instructions.length -1];
            $scope.subscriptionType = {
                adhoc: !!($scope.subscription.intervalUnit == 'adhoc'),
                hasTrial: !!($scope.subscription.instructions && $scope.subscription.instructions[0] &&
                    $scope.subscription.instructions[0].type == 'trial'),
                hasDiscount: $scope.subscription.instructions.filter(function (item) {
                    return (item.type == 'discounted');
                }).length>0,
                finiteEndDate: lastInstruction.periodEndDate,
                free: !$scope.subscription.nextChargeDate && $scope.subscription.nextChargeTotalValue == 0
            };
            $scope.pluralize = subscriptions.pluralize;

            $scope.subscriptionDetails = function() {
              $scope.isToday = subscriptions.isToday;
            };

            $scope.billedString = buildBilledString($scope.subscription.intervalLength, $scope.subscription.intervalUnit);
            $scope.startingString = buildStartingString();

            $scope.$parent.$watch('language', function(newValues, oldValues, scope){
              $scope.billedString = buildBilledString($scope.subscription.intervalLength, $scope.subscription.intervalUnit);
              $scope.startingString = buildStartingString();
            });

            // Returns weekly/monthly/yearly ---if intervalLength = 1
            // Returns 'every 3 months'      ---if intervalLength > 1
            // Plural strings come from filter to make sure we have no language issues
            function buildBilledString(length, unit) {
              if (length == 1) {
                return $filter('phrase')(unit + 'ly');
              };
              if (length > 1) {
                return $filter('phrase')('every') + ' ' + length + ' ' + $filter('phrase')(unit + 's');
              }
            }

            function buildStartingString () {
              // drop Starting if trial is one period long
              if ($scope.subscription.instructions[0].discountDurationLength != 1) {
                var str = $filter('phrase')('Starting') + ' ' + $scope.subscription.nextChargeDate;
                if (!$scope.subscriptionType.finiteEndDate) {
                  str +='.';
                }
                return str;
              };
            }

        }
    }
});

fsApp.directive('crossSell', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      crossSell: '=cs',
      addItem: '&'
    },
    templateUrl: 'crossSellTemplate.html',
    link: function(scope, element, attributes) {

    angular.element(window).ready(function() {
      //initial resizing on when responsive cart is set
      resizeTextOverflow(scope.crossSell);
      angular.element(window).bind('resize', function() {
        //resizing amount of characters that can fit every time after resizing of window
        resizeTextOverflow(scope.crossSell);
        scope.$apply();
      });
    });

    function resizeTextOverflow(crossSell) {
        var crossSellTitleHeight = document.getElementById('crossSell-title-' + crossSell.path);
        var crossSellTitleLabelHeight = document.getElementById('crossSell-title-p-' + crossSell.path);
        if(crossSellTitleLabelHeight == null && crossSellTitleHeight == null) {
          return "fail";
        } else {
          if(crossSellTitleLabelHeight.offsetHeight > crossSellTitleHeight.offsetHeight) {
            document.getElementById('crossSell-title-' + crossSell.path).className = "cross-sell-title cross-sell-title-too-long";
          } else {
            document.getElementById('crossSell-title-' + crossSell.path).className = "cross-sell-title";
          }
        }
      }
    }
  }
});

fsApp.directive('productOption', function() {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      option: '=',
      addItem: '&',
      storeTaxPriceMode: '=',
      modifyItems: '&',
      crossSellsAmount: '=',
      upsell: '=',
      responsive: '='
    },
    templateUrl: 'productOptionTemplate.html',
    link: function(scope, element, attributes) {
      angular.element(window).ready(function() {
        //initial resizing on when responsive cart is set
        if(scope.option.selected) {
          resizeTextOverflow(scope.option);
          angular.element(window).bind('resize', function() {
            //resizing amount of characters that can fit every time after resizing of window
            resizeTextOverflow(scope.option);
            scope.$apply();
          });
        }
      });

      scope.removeItem = function(path) {
        scope.modifyItems({quantity: 0, path: path});
      }

      scope.incrementItemQuantity = function(path) {
        scope.modifyItems({quantity: scope.option.quantity + 1, path: path});
      }

      scope.decrementItemQuantity = function(path) {
        scope.modifyItems({quantity: scope.option.quantity - 1, path: path});
      }

      scope.getRecurringBillStringUpsell = function(length, unit) {
        if (length == 1) {
          return unit + 'ly';
        };
        if (length > 1) {
          return unit + 's';
        }
      };

      function resizeTextOverflow(option) {
          var productOptionTitleHeight = document.getElementById('product-option-title-' + option.path);
          var productOptionTitleLabelHeight = document.getElementById('product-option-display-' + option.path);
          if(productOptionTitleLabelHeight == null && productOptionTitleHeight == null) {
            return "fail";
          } else {
            if(productOptionTitleLabelHeight.offsetHeight > productOptionTitleHeight.offsetHeight) {
              document.getElementById('product-option-title-' + option.path).className = "product-option-title product-option-title-too-long";
            } else {
              document.getElementById('product-option-title-' + option.path).className = "product-option-title";
            }
          }
      }
    }
  }
})

fsApp.directive('onlyDigitInput', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.on('keypress', function(event) {
        if (!isIntegerChar() ) {
          event.preventDefault();
        }

        function isIntegerChar() {
          return /[0-9*]|-/.test(String.fromCharCode(event.which))
        }
      })
    }
  }
});


fsApp.directive('visuallyHiddenSpan', function () {
  return {
    restrict: 'E',
    replace: true,
    template: '<span class="visually-hidden" id={{elementId}} aria-live="polite" aria-atomic="false"></span>',
    scope: {
      elementId: '@'
    }
  };
});


fsApp.directive('usZipCodeInput', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      element.on('keypress', function(event) {
        if (!isIntegerChar() ) {
         event.preventDefault();
        }

        function isIntegerChar() {
          return /[0-9-]|-/.test(String.fromCharCode(event.which))
        }
      })
    }
  }
});

  fsApp.directive('onlyPhoneNumberInput', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        element.on('keypress', function(event) {
          if (!isIntegerChar() ) {
            event.preventDefault();
          }

          function isIntegerChar() {
            return /[0-9+.()-\s]|-/.test(String.fromCharCode(event.which))
          }
        })
      }
    }
  });

/**
 * Directive which addes custom class to target element(button) if trigger element(popover) is visible
 * @param  {string} triggerId - id of the trigger element. Needed to watch it's visibility
 * @param  {string} triggerClassName - name of the class to apply
 */
fsApp.directive('addClassIfTriggerVisible', function() {
    return {
      restrict: 'A',
      scope: true,
      link: function(scope, element, attributes) {
        function addClassIfTriggerVisible() {
          scope.popover = angular.element(document.getElementById(attributes.triggerId))[0];
          var triggerClassName = attributes.triggerClassName || 'selected';

          scope.$watch(
            function() {
              return scope.popover.style.display;
            },
            function(newVal, oldVal) {
              if ((newVal != oldVal) && (newVal === 'block')) {
                element.addClass(triggerClassName);
              }
              if ((newVal != oldVal) && (newVal === 'none')) {
                if (element.hasClass(triggerClassName)) {
                  element.removeClass(triggerClassName);
                }
              }
            }
          );
        }

        angular.element(document).ready(addClassIfTriggerVisible);
      }

    };
  });

  //directive enables static includes without creating a new scope (instead of ng-include)
  fsApp.directive('staticInclude', function($http, $templateCache, $compile) {
    return function(scope, element, attrs) {
      var templatePath = attrs.staticInclude;
      $http.get(templatePath, {
        cache: $templateCache
      }).success(function(response) {
        var contents = element.html(response).contents();
        $compile(contents)(scope);
      });
    };
  });

  fsApp.directive('vaTooltip', ['$http', '$templateCache', '$compile', '$parse', '$timeout', function($http, $templateCache, $compile, $parse, $timeout) {
    //va-tooltip = path to template or pure tooltip string
    //tooltip-updater = scope item to watch for changes when template has to be reloaded [optional (only if template is dynamic)]
    return {
      restrict: 'A',
      scope: true,
      compile: function(tElem, tAttrs) {
        if (!tElem.attr('popover-html-unsafe')) { //Add bootstrap directive
          tElem.attr('popover-html-unsafe', '{{tooltip}}');
        }
        return function(scope, element, attrs) {
          //manually setting attrs is a fix for latest angular + bootstrap
          attrs.tooltipTrigger = attrs.tooltipTrigger;
          attrs.tooltipPlacement = attrs.tooltipPlacement || 'top';

          scope.tooltip = attrs.vaTooltip;
          var tplUrl = $parse(scope.tooltip)(scope);

          function loadTemplate() {
            $http.get(tplUrl, {
              cache: $templateCache
            }).success(function(tplContent) {
              var container = angular.element('<div/>');
              container = ($compile(tplContent.trim())(scope));

              $timeout(function() {
                scope.tooltip = container.html();
              });
            });
          }
          //remove our direcive to avoid infinite loop
          element.removeAttr('va-tooltip');
          //compile element to attach tooltip binding
          $compile(element)(scope);

          if (angular.isDefined(attrs.tooltipUpdater)) {
            scope.$watch(attrs.tooltipUpdater, function() {
              loadTemplate();
            });
          } else {
            loadTemplate();
          }
        };
      }
    };
  }]);

  fsApp.directive('inputModel', function($rootScope, $timeout) {
    return {
      require: 'ngModel',
      scope: {
        email: '=',
        firstname: '=',
        lastname: '=',
        subscribed: '='
      },
      link: function(scope, elem, attr, ngModel) {
        elem.on('blur', function() {
          var update = {
              "update": {
                email: scope.email,
                "firstName": scope.firstname || undefined,
                "lastName": scope.lastname || undefined,
                "subscribed": scope.subscribed ? true : false
              }
            },
            check = {
              "check": $rootScope.oldEmail
            },
            remove = {
              "remove": $rootScope.oldEmail
            };

          scope.updateEmail = function() {
            scope.$parent.http('POST', '/customer/recognize', update,
              function(result) {
                debug('Pinhole', 'Recognition result:', result);
              },
              function(result) {
                debug('Pinhole', 'Recognition result:', result);
              },
              true //this is noRefresh parameter
            );
          };
          scope.removeEmail = function() {
            scope.$parent.http('POST', '/customer/recognize', remove,
              function(result) {
                debug('Pinhole', 'Removal result:', result);
              },
              function(result) {
                debug('Pinhole', 'Removal result:', result);
              },
              true //this is noRefresh parameter
            );
          };

          // *************************************
          // Only if email exists
          if (!!scope.email && scope.email.length > 0) {
            // If email or lastname or firstname has changed - > send update
            if (!!$rootScope.oldEmail && $rootScope.oldEmail.length > 0) {
              if (($rootScope.oldEmail != scope.email) ||
                (scope.$parent.oldFirstname != scope.firstname) ||
                (scope.$parent.oldLastname != scope.lastname)) {
                // check whether old email exists
                // scope.$parent.http('POST', '/customer/recognize', check,
                //  function(result) {
                //  },
                //  function(result) {
                //  }
                // );
                // remove if old email exists
                $timeout(function() {
                  scope.removeEmail();
                  scope.updateEmail();
                }, 200);

                $rootScope.oldEmail = scope.email;
                scope.$parent.oldFirstname = scope.firstname;
                scope.$parent.oldLastname = scope.lastname;
              }
            } else {
              $rootScope.oldEmail = scope.email;
              scope.$parent.oldFirstname = scope.firstname;
              scope.$parent.oldLastname = scope.lastname;

              $timeout(function() {
                scope.updateEmail();
              }, 200);

            }
          }

        }); //on blur end
      }
    };
  });

  fsApp.filter('price', ['$filter', function($filter) {
    return function(num) {
      return (num.replace(/\,/g, '.').replace(/[^0-9.]/g, '') === '0.00') ? $filter('phrase')('Free') : num;
    };
  }]);
  fsApp.filter('priceColor', ['$filter', function($filter) {
    return function(num) {
      return (num.replace(/\,/g, '.').replace(/[^0-9.]/g, '') === '0.00') ? 'text-success' : 'text-danger';
    };
  }]);
  fsApp.filter('optional', ['$filter', function($filter) {
    return function (str, requires) {
      return requires ?  str : str + ' (' + $filter('phrase')('Optional') + ')';
    };
  }]);

  fsApp.filter('format', ['$filter', function($filter) {
    return function(input) {
      const args = Array.prototype.slice.call(arguments, 1);
      return input.replace(/%s/g, () => args.shift());
    };
  }]);

  fsApp.filter('formatPaymentOptions', ['$filter', function($filter) {
    var paymentOptions = {
      "card": "Credit / Debit",
      "paypal": "PayPal",
      "wire": "Wire Transfer",
      "amazon": "Amazon Pay",
      "applepay": "Apple Pay",
      "sofort": "Sofort",
      "giropay": "Giropay",
      "ideal": "iDEAL",
      "alipay": "Alipay",
      "wechatpay": "WeChat Pay",
      "mercadopago": "Mercado Pago",
      "upi": "UPI",
      "purchaseorder": "Invoice",
      "sepa": "SEPA",
      "ach": "ACH - Direct Debit"
    };
    return function(str) {
      return paymentOptions[str];
    }
  }]);

  fsApp.filter('localizedDate', function() {
    return function(date, locale) {
      if (!date) return '';
      locale = locale || 'en-US';
      return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' });
    };
  });

  fsApp.factory('helpers', function() {
    function germanJede(length, unit, flag) {
      if (length > 1) {
        return 'alle';
      } else if (unit === 'week') {
        return flag ? 'Jede' : 'jede';
      } else if (unit === 'month' || unit === 'day') {
        return flag ? 'Jeden' : 'jeden';
      } else if (unit === 'year') {
        return flag ? 'Jedes' : 'jedes';
      }
    }
    return {
      germanJede: germanJede
    }
  });

  /**
   * after-render is a directive that will execute any in-scope method
   * after the page has been rendered.
   */
  fsApp.directive('afterRender', ['$timeout', function($timeout) {
      var def = {
        restrict: "A",
        terminal: true,
        transclude: false,
        link: function (scope, element, attrs) {
          $timeout(scope.$eval(attrs.afterRender), 0); //Calling a scoped method
        }
      };
      return def;
    }
  ]);

  fsApp.directive('subscriptionTerms', function() {
    return {
      restrict: 'E',
      templateUrl: 'subscription-terms.html'
    }
  });

  fsApp.directive('phoneNumber', function() {
    return {
      restrict: 'E',
      templateUrl: 'phone-number.html'
    }
  });

  fsApp.directive('email', function() {
    return {
      restrict: 'E',
      templateUrl: 'email.html'
    }
  });

  fsApp.directive('emailSubscriptionList', function() {
    return {
      restrict: 'E',
      templateUrl: 'email-subscription-list.html'
    }
  });

  fsApp.directive('fullName', function() {
    return {
      restrict: 'E',
      templateUrl: 'full-name.html'
    }
  });

  fsApp.directive('firstName', function() {
    return {
      restrict: 'E',
      templateUrl: 'first-name.html'
    }
  });

  fsApp.directive('lastName', function() {
    return {
      restrict: 'E',
      templateUrl: 'last-name.html'
    }
  });

  fsApp.directive('company', function() {
    return {
      restrict: 'E',
      templateUrl: 'company.html'
    }
  });

  fsApp.directive('recipientInformation', function() {
    return {
      restrict: 'E',
      templateUrl: 'recipient-information.html'
    }
  });

  fsApp.directive('recipientDetails', function() {
    return {
      restrict: 'E',
      templateUrl: 'recipient-details.html'
    }
  });

  fsApp.directive('recipientFullName', function() {
    return {
      restrict: 'E',
      templateUrl: 'recipient-full-name.html'
    }
  });

  fsApp.directive('recipientEmail', function() {
    return {
      restrict: 'E',
      templateUrl: 'recipient-email.html'
    }
  });

  fsApp.directive('recipientMessage', function() {
    return {
      restrict: 'E',
      templateUrl: 'recipient-message.html'
    }
  });

  fsApp.directive('additionalContactCheckbox', function() {
    return {
      restrict: 'E',
      templateUrl: 'additional-contact-checkbox.html'
    }
  });

  fsApp.directive('contactAddressLine1', function() {
    return {
      restrict: 'E',
      templateUrl: 'contact-address-line1.html'
    }
  });

  fsApp.directive('contactAddressCity', function() {
    return {
      restrict: 'E',
      templateUrl: 'contact-address-city.html'
    }
  });

  fsApp.directive('contactAddressRegion', function() {
    return {
      restrict: 'E',
      templateUrl: 'contact-address-region.html'
    }
  });

  fsApp.directive('contactAddressPostalCode', function() {
    return {
      restrict: 'E',
      templateUrl: 'contact-address-postal-code.html'
    }
  });

  // PayPalButton (container agnostic rendering)
  fsApp.directive('paypalButton', function PayPalButton() {
    return {
      restrict: 'E',
      scope: false,
      template: '<div class="paypal-button-slot"></div>',
      controller: [
        '$scope', '$http', '$element', '$timeout', 'env',
        function _PayPalButtonController($scope, $http, $element, $timeout, env) {

          // State
          let globalPayPalResponseData = null;
          let buttonsInstance = null;
          let destroyed = false;
          let flowOpen = false;     // prevent re-init
          const slot = $element[0].querySelector('.paypal-button-slot');

          const clientId = $scope.paymentOptionVariables.payPalClientId;
          let currency = $scope.currency;

          // Helpers
          function isRenderable(el) {
            if (!el || !document.body.contains(el)) return false;
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;

            // If size is 0, it may be in a collapsed parent
            const rect = el.getBoundingClientRect();
            if ((rect.width === 0 || rect.height === 0)) {
              // Check ancestors for display:none/visibility:hidden
              let p = el;
              while (p && p !== document.body) {
                const ps = getComputedStyle(p);
                if (ps.display === 'none' || ps.visibility === 'hidden') return false;
                p = p.parentElement;
              }
            }
            return true;
          }

          function waitUntilVisibleThen(fn, timeoutMs = 4000, pollMs = 150) {
            const start = Date.now();
            (function tick() {
              if (destroyed) return;
              if (isRenderable(slot)) { fn(); return; }
              if (Date.now() - start > timeoutMs) { fn(); return; } // try anyway after timeout
              $timeout(tick, pollMs, false); // no digest thrash
            })();
          }

          // Loads or reuses the PayPal SDK for (clientId, currency), then cb()
          $scope.loadPayPalSDK = function loadPayPalSDK(clientId, curr, cb) {
            const src = `https://www.paypal.com/sdk/js?client-id=${clientId}` +
                        `&vault=true&intent=tokenize&components=buttons` +
                        `&disable-funding=card,credit&currency=${curr}`;
            const existing = document.getElementById('paypal-sdk-script');

            // If script tag with same params exists, reuse it
            if (existing) {
              if (existing.getAttribute('src') === src) {
                if (window.paypal && window.paypal.Buttons) { cb(); return; }
                existing.addEventListener('load', cb, { once: true });
                return;
              }
              // Different params -> replace it
              if (existing.parentNode) existing.parentNode.removeChild(existing);
            }

            const script = document.createElement('script');
            script.id = 'paypal-sdk-script';
            script.src = src;
            script.onload = cb;
            document.body.appendChild(script);
          };

          $scope.hasAdhocSubscription = function (scope) {
            let groups = scope.groups || scope.order.groups;
            let hasAdhoc = false;
            if (groups && groups.length > 0) {
              groups.forEach(function(group) {
                if (group.selections) {
                  group.items.forEach(function(item) {
                    if (item.selected && item.subscription && item.subscription.intervalUnit === 'adhoc') {
                      hasAdhoc = true;
                    }
                  });
                }
              });
            }
            return hasAdhoc;
          };

          $scope.createBillingAgreementData = function() {
            const contact = $scope.contact || {};
            const mailingList = $scope.mailingList || {};
            return {
              paymentType: 'paypal',
              subscribe: mailingList.subscribe,
              autoRenew: $scope.hasAdhocSubscription($scope) ? null : $scope.subscriptionCheckbox.autoRenew,
              isPayPalInContext: true,
              contact: {
                firstName: contact.firstName || '',
                lastName: contact.lastName || '',
                email: contact.email || '',
                postalCode: contact.postalCode || ''
              }
            };
          };

          // Render flow
          function initializePayPalButton() {
            if (destroyed) return;

            // Prevent double-render
            if (buttonsInstance) return;

            if (!window.paypal || !window.paypal.Buttons) {
              // SDK not ready yet; try again shortly
              $timeout(initializePayPalButton, 50, false);
              return;
            }

            // PayPal prefers a visible container
            if (!isRenderable(slot)) {
              waitUntilVisibleThen(initializePayPalButton);
              return;
            }

            try {
              // Clear stale DOM from previous attempts
              while (slot.firstChild) slot.removeChild(slot.firstChild);

              // Close handler for tab/unload while flow open
              function onTabClose() {
                if (!globalPayPalResponseData) return;
                const paypalToken = globalPayPalResponseData.paypalToken;
                const cancelAgreementUrl = `${globalPayPalResponseData.cancelUrl}?token=${paypalToken}`;
                // Fire-and-forget
                $http.get(cancelAgreementUrl).catch(function(){});
              }
              $scope.onTabClose = onTabClose;
              window.addEventListener('beforeunload', onTabClose);

              buttonsInstance = window.paypal.Buttons({
                style: { shape: "rect", layout: "vertical", color: "gold", label: "paypal" },

                onInit: function (data, actions) {
                  const formElement = angular.element(document.getElementById('orderForm'));
                  const form = formElement && formElement.controller && formElement.controller('form');
                  if (form && !form.$invalid) actions.enable(); else actions.disable();
                  if (form) form.isPayPalInContext = true;

                  // Live toggle enable/disable based on validity
                  var inputs = document.querySelectorAll('#orderForm input, #orderForm select');
                  Array.prototype.forEach.call(inputs, function (input) {
                    input.addEventListener('input', function () {
                      if (form && !form.$invalid) actions.enable(); else actions.disable();
                    });
                  });
                },

                onClick: function () {
                  flowOpen = true; // prevent re-init while popup is active
                  const formElement = angular.element(document.getElementById('orderForm'));
                  const form = formElement && formElement.controller && formElement.controller('form');
                  $scope.next && $scope.next(form);
                },

                createBillingAgreement: function () {
                  var createBillingAgreementUrl = env.lastSessionUrl + '/payment';
                  var data = $scope.createBillingAgreementData();

                  return $http({
                    method: 'POST',
                    url: createBillingAgreementUrl,
                    headers: { 'Content-Type': 'application/json' },
                    data: data
                  }).then(function (response) {
                    var result = response.data;
                    if (result.next === 'error') {
                      $scope.messages.push({
                        type: result.messages[0].type,
                        phrase: result.messages[0].phrase
                      });
                      return Promise.reject(new Error('Billing agreement error'));
                    } else {
                      globalPayPalResponseData = result.payPalInContextResponse;
                      return globalPayPalResponseData.paypalToken;
                    }
                  }).catch(function (error) {
                    console.error('Error during createBillingAgreement:', error);
                  });
                },

                onApprove: function () {
                  flowOpen = false;
                  window.removeEventListener('beforeunload', $scope.onTabClose);

                  const paypalToken = globalPayPalResponseData && globalPayPalResponseData.paypalToken;
                  const finalizeAgreementUrl = `${globalPayPalResponseData.returnUrl}?token=${paypalToken}`;

                  return $http.get(finalizeAgreementUrl)
                    .then(function (response) { return response.data; })
                    .then(function (redirectUrl) {
                      // prevent auto-close of confirmation module
                      try { window.removeEventListener('unload', $scope.popupClose); } catch(_) {}
                      window.parent.location.href = redirectUrl;
                      return redirectUrl;
                    })
                    .catch(function (error) {
                      console.error('Error during billing agreement finalization:', error);
                    });
                },

                onCancel: function () {
                  flowOpen = false;
                  window.removeEventListener('beforeunload', $scope.onTabClose);

                  const paypalToken = globalPayPalResponseData && globalPayPalResponseData.paypalToken;
                  const cancelAgreementUrl = `${globalPayPalResponseData.cancelUrl}?token=${paypalToken}`;

                  return $http.get(cancelAgreementUrl)
                    .then(function (response) {
                      return response.status;
                    })
                    .catch(function (error) {
                      console.error('Error during cancel billing agreement finalization:', error);
                    });
                },

                onError: function () {
                  flowOpen = false;
                  window.removeEventListener('beforeunload', $scope.onTabClose);

                  const paypalToken = globalPayPalResponseData && globalPayPalResponseData.paypalToken;
                  const errorUrl = `${globalPayPalResponseData.cancelUrl.replace("cancelInContext", "errorInContext")}?token=${paypalToken}`;

                  return $http.get(errorUrl)
                  .then(function(response) {
                    return response.status;
                  })
                  .catch(function(error) {
                    console.error('Error during cancel billing agreement finalization:', error);
                  });
                }
              });

              // Render into THIS directive's slot (no selector strings)
              buttonsInstance.render(slot).catch(function () {
                // If render fails (ex: became hidden mid-render), retry once visible
                buttonsInstance = null;
                waitUntilVisibleThen(initializePayPalButton);
              });

            } catch (e) {
              console.error('PayPal init error:', e);
              buttonsInstance = null; // allow retry
            }
          }

          // React to currency changes
          $scope.$watch('currency', function (newCurrency, oldCurrency) {
            if (!newCurrency || newCurrency === oldCurrency) return;
            currency = newCurrency;
            if (flowOpen) return;
            $scope.loadPayPalSDK(clientId, currency, function () {
              buttonsInstance = null; // force a fresh render (params changed)
              waitUntilVisibleThen(initializePayPalButton);
            });
          });

          $scope.loadPayPalSDK(clientId, currency, function () {
            waitUntilVisibleThen(initializePayPalButton);
          });

          // Cleanup
          $scope.$on('$destroy', function () {
            destroyed = true;
            try { window.removeEventListener('beforeunload', $scope.onTabClose); } catch(_) {}
            // Clear this slot's DOM, PayPal v2 lacks a public destroy API
            if (slot) while (slot.firstChild) slot.removeChild(slot.firstChild);
            buttonsInstance = null;
          });
        }
      ]
    };
  });

  fsApp.directive('renewalInvoiceDetails', function() {
    return {
      restrict: 'E', // Use as <renewal-invoice></renewal-invoice>
      templateUrl: 'renewal-invoice-details.html'
    };
  });

  angular.module('app.controllers', []).controller('controller',
        ['$scope', '$http', 'initData', '$modal', 'env', '$filter', '$rootScope', '$timeout', '$receiveMessage', '$sce', 'subscriptions', '$q', 'helpers', '$interval',
    function ($scope, $http, initData, $modal, env, $filter, $rootScope, $timeout, $receiveMessage, $sce, subscriptions, $q, helpers, $interval) {

      $scope.isOnfastspring = function() {
        let fsRegex = /(^[^\s\.]*.onfastspring.com)/;
        return fsRegex.test(window.location.hostname);
      }

      $scope.formSubmitted = false;
      $scope.updateFormSubmitted = function (value) {
          $scope.formSubmitted =  value;
      }

      var sendSubscriptionStatusTimer = null;

      /* defining a function to highlight ach form controls when payment fails */
      function highlightAchFormControl(message='') {
        /* defining a constant map to relate ACH form control inputs with invalid message error */
        const ACH_FORM_CONTROLS = new Map();
        ACH_FORM_CONTROLS.set('AchInvalidRoutingNumber', 'ach.routingNum');

        let controlForm = ACH_FORM_CONTROLS.get(message);
        if(controlForm !== null && controlForm !== undefined) {
          let parentDiv = document.getElementById(controlForm).parentElement;
          parentDiv.classList.add('has-error');
          parentDiv.classList.add('invalid-field-icon');
          focusOnFirstInvalidField();
        }
      }

      /**
       * @author Julian Olarte <jolarte@fastspring.com>
       * @team cafeteros team
       * this function is created to send subscribe status on change event on checkbox
       */
      $scope.sendSubscriptionStatus = function() {

        if(!$scope.contact.email.includes("@")) {
          return;
        }

        if(sendSubscriptionStatusTimer) {
          $timeout.cancel(sendSubscriptionStatusTimer);
        }

        sendSubscriptionStatusTimer = $timeout(function() {

          var update = {
            update: {
              email: $scope.contact.email,
              firstName: $scope.contact.firstname || undefined,
              lastName: $scope.contact.lastname || undefined,
              subscribed: $scope.mailingList.subscribe ? true : false
            }
          };

          $scope.http('POST', '/customer/recognize', update,
              function(result) {
                debug('Pinhole', 'Recognition result:', result);
              },
              function(result) {
                debug('Pinhole', 'Recognition result:', result);
              },
              true //this is noRefresh parameter
          );

        }, 3000);
      };

      //Following code needed for alignment and style of new popup with tooltips, displaying all payment options with new icons

      $scope.state = false;               // Set the default tooltip state
      $scope.isAppleDevice = (/iPhone|iPod|iPad/i.test(navigator.userAgent));
      $scope.paymentMethodsBreakCount = 5;
      $scope.pixAllowRecurring = false;

      $scope.search = {
        'searchInputCountry': '',
        'searchInputLanguage': ''
      };
      $scope.clearSearchInput = function(element) {
        if (element === 'country') {
          $scope.search.searchInputCountry = '';
        } else {
          $scope.search.searchInputLanguage = '';
        }
      }

      // Keep track of failed attempts
      $scope.renewalInvoiceAttempts = 0;
      $scope.getRenewalInvoiceDetails = function () {
        // Run only if the session is a renewalInvoice flow
        if (!$scope.isRenewalInvoice()) {
          return Promise.resolve(null);
        }
        // If we already have the data, just return it immediately
        if ($scope.renewalInvoiceInfo) {
          return Promise.resolve($scope.renewalInvoiceInfo);
        }

        // If already tried 3 times and still failing, stop retrying
        if ($scope.renewalInvoiceAttempts >= 3) {
          return Promise.reject(new Error('Max retries reached for renewalInvoice details'));
        }

        // If a request is already in progress, return the same promise
        if ($scope.loadingRenewalInvoice) {
          return $scope.loadingRenewalInvoice;
        }

        const renewalInvoiceUrl = env.lastSessionUrl + '/renewalInvoice';

        // Store the promise in loadingRenewalInvoice so other calls can reuse it
        $scope.loadingRenewalInvoice = $http.get(renewalInvoiceUrl)
            .then(function (response) {
              $scope.renewalInvoiceInfo = response.data;
              $scope.renewalInvoiceAttempts = 0; // reset attempts if successful
              return $scope.renewalInvoiceInfo;
            })
            .catch(function (error) {
              if (error.status === 404) {
                $scope.renewalInvoiceAttempts++;
                console.warn(
                    `renewalInvoice 404 attempt ${$scope.renewalInvoiceAttempts}/3`
                );
              }
              $scope.renewalInvoiceInfo = null;
              throw error;
            })
            .finally(function () {
              $scope.loadingRenewalInvoice = false;
            });

        return $scope.loadingRenewalInvoice;
      };

      /**
       * Sets the bic selection value after the user cleans up missing information that they didn't fill out.
       */
      $scope.setDropdownWithImagesDisplay = function(bic) {
        let label = null;
        switch (bic) {
          case "INGBNL2A":
            label = "ING Bank";
            break;
          case "RABONL2U":
            label = "Rabobank";
            break;
          case "ABNANL2A":
            label = "ABN AMRO Bank N.V";
            break;
          case "SNSBNL2A":
            label = "De Volksbank N.V (SNSBNL2A)";
            break;
          case "RBRBNL21":
            label = "De Volksbank N.V (RBRBNL21)";
            break;
          case "ASNBNL21":
            label = "De Volksbank N.V (ASNBNL21)";
            break;
          case "BUNQNL2A":
            label = "bunq B.V";
            break;
          case "KNABNL2H":
            label = "Knab";
            break;
          case "BITSNL2A":
            label = "Bitsafe Payments";
            break;
          case "REVOLT21":
            label = "Revolut Payments UAB";
            break;
          case "TRIONL2U":
            label = "Triodos Bank N.V";
            break;
          case "FVLBNL22":
            label = "Van Lanschot Kempen N.V";
            break;
          case "NTSBDEB1":
            label = "N26 Bank AG";
            break;
          case "HANDNL2A":
            label = "Svenska Handelsbanken (PUBL) AB";
            break;
          default:
            break;
        }
        if (label) {
          document.querySelector('#' + anchorId).childNodes.item(0).nodeValue = label;
        }
      }

      $scope.activateTab = function() {
        try {
          var popovers = document.getElementsByClassName('locale-btn-inline-checkout');
          var activePopover = Array.prototype.find.call(popovers, function(element) {
            return element.style.display === 'block';
          });
          if (activePopover) {
            [' .choose-country-tab', ' .choose-language-tab', ' .choose-country-content', ' .choose-language-content'].forEach(function(element) {
              document.querySelector('#' + activePopover.id + element).classList.toggle('active');
            });
          }
        } catch(e) {
        }
      }

      $scope.validationConstants = {
        "MAX_LENGTH_255" : 255,
        "MAX_LENGTH_159" : 159,
        "MAX_LENGTH_POSTAL" : 32,
        "MAX_LENGTH_CC" : 25,
        "MAX_LENGTH_MM" : 2,
        "MAX_LENGTH_YY" : 4,
        "MAX_LENGTH_CVC" : 5,
        "MAX_LENGTH_QTY" : 4,
        "MAX_QTY" : 9999
      };

      $scope.displayCart = function () {
        $scope.isCartSelected = true;
        $scope.isCartViewEnabled = false;
      };

      $scope.closeCart = function () {
        $scope.isCartSelected = false;
        if ($scope.variables.responsiveCart === 'true') {
          $scope.responsiveCartModal.dismiss('cancel');
        }
        cardMonthYearMutationObserver();
        $scope.renderCaptchaWidget();
      };

      $scope.openGenerateQuote = function(){
        $scope.closeCart();
        $scope.selectGenerateQuote();
      };

      $scope.getQuantityForAllItems = function() {
        var totalQty = 0;
        $scope.groups.forEach(function(group) {
          totalQty += traverseGroup(group);
        });
        return totalQty;
      };

      $scope.openLocaleDialog = function() {
        if($scope.variables.countrySelector == "disabled" || $scope.variables.countrySelector == "hidden") {
          return;
        } else {
          if ($scope.isInlineCheckout) {
            setTimeout(function() {
              document.getElementById("locale-btn-inline-checkout").click();
            }, 0);
          } else {
            document.getElementById("locale-button").click();
          }
          $timeout( function(){
            document.getElementById("chooseCountry").getElementsByTagName('a')[0].focus();
          }, 0 );
        }
      }

      function traverseGroup(group) {
        var itemQty = 0;
        if (group && group.selections) {
          group.items.forEach(function(item) {
            if (item.groups && !item.bundle && !itemHasOneTimeSetupFee(item)) {
              itemQty += traverseGroup(item.groups[0]);
            }
            if (item.selected && item.path !== "SystemExtension.shippingcalculation") {
              if (item.pricing && item.pricing.quantity === "hide"){
                itemQty += 1;
              } else {
                itemQty += item.quantity;
              }
            }
          });
        }
        return itemQty;
      };

      function itemHasOneTimeSetupFee(item) {
        return item && item.groups && item.groups[0] && item.groups[0].type === "setup-fee";
      };

      $scope.isCartEmpty = function() {
        if ($scope.groups[0] && $scope.groups[0].items) {
          return !($scope.groups[0].items.length > 0);
        } else {
          return true;
        }
      };

      $scope.countReplaceItems = function(groups) {
        var count = 0;
        angular.forEach(groups, function(upsell) {
          if (upsell.type === 'replace') {
            count += upsell.items.length;
          }
        });
        return count;
      };

      $scope.scroll = function(selector, direction) {
        var container = document.querySelector(selector);
        if (container) {
          var currentScrollLeft = container.scrollLeft;
          if(direction === "right"){
            container.scrollLeft = currentScrollLeft + 210;
          } else if ( direction === "left"){
            container.scrollLeft = currentScrollLeft - 210;
          }

        }
      };

      $scope.termsAndPolicies = function () {
        const country = $scope.country;
        let validCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB','UK', 'JP', 'NO', 'CH'];
        if (!validCountries.includes(country)) {
          return [];
        }

        var TERMS_OF_SALE_US = 'https://www.fastspring.com/terms-sale-us.html?utm_source=Store&utm_medium=Terms_of_Sale_US&utm_content=Pinhole&utm_campaign=Store_Traffic';
        var TERMS_OF_SALE_EU = 'https://www.fastspring.com/terms-sale-eu.html?utm_source=Store&utm_medium=Terms_of_Sale_EU&utm_content=Pinhole&utm_campaign=Store_Traffic';
        var PRIVACY_POLICY = 'https://fastspring.com/privacy?utm_source=Store&utm_medium=Privacy_Policy&utm_content=Pinhole&utm_campaign=Store_Traffic';

        let policies = {
          DE: { terms: 'https://fastspring.com/fastspring-terms-sale-germany/', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-germany/' },
          JP: { terms: 'https://fastspring.com/terms-use/terms-sale-japan/', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-japan/' },
          FR: { terms: 'https://fastspring.com/terms-use/fastspring-terms-sale-france/', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-france/' }
        };


        let termsURL = policies[country]?.terms || (validCountries.includes(country) ? TERMS_OF_SALE_EU : TERMS_OF_SALE_US);
        let privacyURL = policies[country]?.privacy || PRIVACY_POLICY;


        let rawTemplate = $filter('phrase')('GDPR');
        let rendered = rawTemplate
            .replace('%TERMS%', termsURL)
            .replace('%PRIVACY%', privacyURL);

        return $sce.trustAsHtml(rendered);
      };

      $scope.isCpfRequiredForSubscription = function(option) {
        let cpfRequiredTypes = ["pix"];
        // Use passed option.type if available, otherwise fall back to $scope.payment.optionType
        let paymentType = (option && option.type) || $scope.payment.optionType;
        if (!cpfRequiredTypes.includes(paymentType)) {
          return false;
        }

        // CPF is required for PIX Automatico (recurring payments)
        let promptCpf = $scope.paymentOptionVariables && $scope.paymentOptionVariables.promptPixCpfNumber == true;
        let pixSupportsRecurring = $scope.pixAllowRecurring === true;
        let userOptedIntoAutoRenew = $scope.subscriptionCheckbox && $scope.subscriptionCheckbox.autoRenew == true;
        let noCheckboxAvailable = !$scope.subscriptionCheckbox || !$scope.subscriptionCheckbox.display;
        // Check for managed subscriptions (ON_DEMAND period, intervalUnit = 'adhoc')
        // Use $rootScope.containsAdhoc which is set when processing order items (checks item.future.intervalUnit)
        // Also check hasAdhocSubscription as fallback (checks item.subscription.intervalUnit)
        let isManagedSubscription = $rootScope.containsAdhoc === true
            || ($scope.hasAdhocSubscription && $scope.hasAdhocSubscription($scope));

        // Return true when:
        // 1. Backend indicates recurring (promptCpf) AND (user opted in OR no checkbox)
        // 2. PIX supports recurring (pixAllowRecurring) AND (user opted in OR no checkbox - implied recurring)
        // 3. Managed subscription (adhoc/ON_DEMAND) - always requires CPF for PIX
        return (promptCpf && (userOptedIntoAutoRenew || noCheckboxAvailable))
            || (pixSupportsRecurring && (userOptedIntoAutoRenew || noCheckboxAvailable))
            || isManagedSubscription;
      };


      //keep managing amount of clicks recorded for all crossSells
      $scope.clicks = 0;

      //shift crossSells right
      $scope.shiftRight = function () {
        var container = document.getElementsByClassName("cross-sell-container")[0];
        if($scope.clicks == $scope.allCrossSells.length-1){
          $scope.clicks = 0;
          $scope.sideScroll(container,'left',30,250 * $scope.allCrossSells.length, 50);
        } else {
          $scope.clicks = $scope.clicks + 1;
          $scope.sideScroll(container,'right',65,250,55);
        }
      };

      //shift crossSells left
      $scope.shiftLeft = function () {
        var container = document.getElementsByClassName("cross-sell-container")[0];
        if($scope.clicks > 0) {
          $scope.clicks = $scope.clicks - 1;
          $scope.sideScroll(container,'left',65,250,55);
        }
      };

      //generates the movement within the crossSells containers
      $scope.sideScroll = function(element,direction,speed,distance,step){
        var scrollAmount = 0;
        var slideTimer = setInterval(function(){
          if(direction == 'left'){
              element.scrollLeft -= step;
            } else {
              element.scrollLeft += step;
            }
            scrollAmount += step;
            if(scrollAmount >= distance){
              window.clearInterval(slideTimer);
            }
        }, speed);
      }

      $scope.mobileDevice = function() {
        const ua = navigator.userAgent || navigator.vendor || window.opera;

        // Common mobile indicators in user agent string
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|Silk|Kindle|Windows Phone|PlayBook/i.test(ua);

        const isTouch = navigator.maxTouchPoints > 0;

        // Prevent touch laptops/tablets-in-desktop-mode from being treated as "mobile"
        const isSmallScreen = window.matchMedia
          ? window.matchMedia("(max-width: 768px)").matches
          : window.innerWidth <= 768;

        // iPadOS sometimes reports "Macintosh" — treat as mobile only if touch + small screen
        const isIPadAsMac = /Macintosh/i.test(ua) && isTouch && isSmallScreen;

        return (isTouch && isMobileUA && isSmallScreen) || isIPadAsMac;
      };


      $scope.getRecurringBillString = function(length, unit) {
        if (length == 1) {
          return $filter('phrase')(unit + 'ly');
        };
        if (length > 1) {
          return $filter('phrase')('every') + ' ' + length + ' ' + $filter('phrase')(unit + 's');
        }
      };

      $scope.getCartPricingTaxLine = function() {

        if ($scope.taxType === 'US' && $scope.country === 'US') {
          return 'cartPricingTax.html';
        } else if ($scope.taxType === 'VAT') {
          return 'cartPricingVAT.html';
        } else if ($scope.taxType === 'GST') {
          return 'cartPricingGST.html';
        } else if ($scope.taxType === 'JCT') {
          return 'cartPricingConsumptionTax.html';
        } else {
          return 'cartPricingTaxNone.html';
        }
      };

      $scope.getBundleInfo = function(item) {
        if (item && item.bundle) {
          return Array.prototype.map.call(item.groups[0].items, function(item) { return item.display; }).join(", ");
        } else {
          return "";
        }
      };

      $scope.checkForOverflow = function(index){
        var element = document.getElementById(index);
        if(element != null) {
          if (element.clientWidth != null && element.scrollWidth != null) {
            return element.clientWidth < element.scrollWidth;
          }
        }
      };

      $scope.checkForInfoOverflow = function(index){
        var element = document.getElementById(index);
        var containerWidth = 210;
        if(element != null) {
          if (element.scrollWidth != null) {
            return containerWidth < element.scrollWidth;
          }
        }
      };

      $scope.checkForOptionOverflow = function(index){
        var element = document.getElementById(index);
        var containerWidth = 160;
        if(element != null) {
          if (element.scrollWidth != null) {
            return containerWidth < element.scrollWidth;
          }
        }
      };

      $scope.getFirstProductDisplayNameInCart = function() {
        if ($scope.groups && $scope.groups[0] && $scope.groups[0].items && $scope.groups[0].items[0]) {
          return $scope.groups[0].items[0].display;
        } else {
          return '';
        }
      }

      $scope.paymentModalFocus = function(init) {
        try {
          if ("paymentModal" in $scope && "opened" in $scope.paymentModal && !init) {
            $scope.paymentModal.opened.then(function() {
              setTimeout(
                function() {
                  var selected = document.querySelector('.modal label.selected input');
                  if (selected !== null) {
                    selected.focus();
                  }
                },
                500
              );
            });
          }
        }
        catch(e) {
          // NOOP
        }
      };

      $scope.isRenewalInvoice = () => {
        return $scope.renewalInvoiceId && $scope.renewalInvoiceId.trim().length > 0;
      }

      $scope.selectGenerateQuote = function() {
        $scope.payment.optionType = 'quote';
        $scope.completed = false;
        if($scope.variables.responsiveCart === 'true') {
          $scope.choosePaymentOptionWithFields();
        }
        $scope.paymentModalFocus();

        $scope.sendResizeMessage();
      }

      // pre select apple pay
      $scope.preSelectApplePay = function() {
        if (window.PaymentRequest && window.PaymentRequest != null && $scope.paymentOptionList.some(element => element.type === 'applepay')) {
          for (let i = 0; i < $scope.paymentOptionList.length; i++) {
            if ($scope.paymentOptionList[i].type === 'applepay') {
              let applePayOption = $scope.paymentOptionList[i];
              $scope.enableEmbeddedApplePay = applePayOption.enableEmbeddedPopup ? applePayOption.enableEmbeddedPopup : false;
              $scope.enableEmbeddedNativeApplePay = applePayOption.enableEmbeddedNative ? applePayOption.enableEmbeddedNative : false;

              let isPreSelectApplePay = $scope.enableEmbeddedApplePay || $scope.variables.enablePaymentHierarchyPreSelectApplePay;

               if (isPreSelectApplePay && !$scope.savedPaymentMethod) {
                if (!isSafari && !isiOSMobile) {
                  $scope.enableEmbeddedApplePay = false;
                  continue;
                }
                // Show apple pay iframe button first
                $scope.paymentOptionList.splice(i, 1);
                $scope.paymentOptionList.splice(0, 0, applePayOption);

                if ($scope.variables.enablePaymentHierarchyPreSelectApplePay) {
                  // Do not override when a payment method is pre-selected in the SBL request.
                  if (!$scope.payment.optionTypeBySBL && !$scope.payment.refreshForTaxRequest) {
                    $scope.option = $scope.paymentOptionList[0];
                    $scope.payment.optionType = $scope.paymentOptionList[0].type;
                  }
                } else {
                  // Current behavior in production, this pre-select ApplePay in all scenarios.
                  $scope.option = $scope.paymentOptionList[0];
                  $scope.payment.optionType = $scope.paymentOptionList[0].type;
                }

                let url = $scope.session.applePayUrl;
                url += "&buttonOnly=true&compliance=" + ((!$scope.complianceData.enabled) || $scope.complianceData.checked || $scope.enableNewTermsAndPolicy);
                if ($scope.isDarkMode) {
                  url += "&darkMode=true";
                }
                $scope.applePayEmbeddedUrl = $sce.trustAsResourceUrl(url);
              }
            }
          }
        }
      }

      // Call a function after Angular's digest *and* after the next paint(s)
      $scope.afterPaint = function (fn) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            // If fn mutates $scope, prefer: $scope.$applyAsync(fn);
            fn();
          });
        });
      }

      $scope.SCREEN_MAX_350 = false;
      $scope.SCREEN_MAX_476 = false;
      $scope.SCREEN_MAX_578 = false;
      $scope.SCREEN_MIN_579 = false;

      function updateScreenSizeFlags(width) {
        $scope.SCREEN_MAX_350 = width <= 350;
        $scope.SCREEN_MAX_476 = width > 350 && width <= 476;
        $scope.SCREEN_MAX_578 = width > 476 && width <= 578;
        $scope.SCREEN_MIN_579 = width >= 579;
      }

      //split paymentOptionList into two lists. One array holds displayed payment options the other array "otherPaymentOptions" holds the listed methods from the payment options.
      $scope.checkMaxPaymentOptions = function(paymentOptionsList) {

        const smallerScreen = window.matchMedia("(max-width: 410px)").matches;
        // based on the container width - show either
        if ( ($scope.variables.themeModeJS === 'dark' && $scope.variables.newLightThemeJS === 'yes') ||
-            ($scope.isInlineCheckout && ($scope.isPaymentMethodButtonLogoOnly || $scope.isPaymentMethodButtonLogoWithLabel))) {
          if ($scope.variables.themeModeJS === 'dark') {
            $scope.paymentMethodsBreakCount = 3;
          } else {
            let realContainer = document.querySelector('.inline-checkout-modal .modal-dialog');
            if (realContainer) {
              updateScreenSizeFlags(document.querySelector('#ng-app').clientWidth);
              if ($scope.SCREEN_MAX_350 || $scope.SCREEN_MAX_476) {
                $scope.paymentMethodsBreakCount = 3;
              } else if ($scope.SCREEN_MAX_578) {
                $scope.paymentMethodsBreakCount = 4;
              } else if ($scope.SCREEN_MIN_579) {
                $scope.paymentMethodsBreakCount = 5;
              }
            }
          }
          if(paymentOptionsList.length > $scope.paymentMethodsBreakCount){
            $scope.listPaymentOptions = paymentOptionsList.slice(0, ($scope.paymentMethodsBreakCount));
            $scope.otherPaymentOptions = paymentOptionsList.slice(($scope.paymentMethodsBreakCount), paymentOptionsList.length);
          } else {
            $scope.listPaymentOptions = paymentOptionsList;
            $scope.otherPaymentOptions = [];
          }
        } else {
          $scope.paymentMethodsBreakCount = 5;
          if (($scope.isInlineCheckout && $scope.mobileDevice()) || smallerScreen ) {
            $scope.paymentMethodsBreakCount = 4;
          }

          if(paymentOptionsList.length > $scope.paymentMethodsBreakCount){
            $scope.listPaymentOptions = paymentOptionsList.slice(0, ($scope.paymentMethodsBreakCount - 1));
            $scope.otherPaymentOptions = paymentOptionsList.slice(($scope.paymentMethodsBreakCount - 1), paymentOptionsList.length);
          } else {
            $scope.listPaymentOptions = paymentOptionsList;
            $scope.otherPaymentOptions = [];
          }
        }

        if (Array.isArray($scope.listPaymentOptions)) {
          $scope.totalPaymentOptions = $scope.listPaymentOptions.length;
        }
        //style payment options with css using ng-style. Same with tooltips
        $scope.stylePaymentOptions();
        $scope.styleToolTip();

        // ****************** AccordionView Section Start ****************** //
        if ($scope.isAccordionView) {
          $scope.pmReady = false;
          $scope.pmAnimating = true;

          $scope.canon = function (s) {
            return (s == null ? '' : ('' + s)).trim().toLowerCase();
          };
          $scope.pmKey = function (opt) {
            return $scope.canon(opt && (opt.optionType != null ? opt.optionType : opt.type));
          };

          let all = $scope.paymentOptionList || [];
          all = all.filter(function (opt) {
            let t = $scope.pmKey(opt);
            return t !== APPLE_PAY && t !== GOOGLE_PAY;
          });

          let MAX_VISIBLE = all.length <= 5 ? all.length : 4;
          $scope.allOptions     = all;
          $scope.visibleOptions = all.slice(0, MAX_VISIBLE);
          $scope.moreOptions    = all.slice(MAX_VISIBLE);

          // ensure model objects exist
          $scope.payment = $scope.payment || {};
          if (typeof $scope.payment.optionType === 'undefined') $scope.payment.optionType = null;

          // UI state for "More…"
          $scope.showAllPaymentMethods = $scope.showAllPaymentMethods === true ? true : false;

          // effects to run after a selection change
          function runPMSelectionEffects() {
            if (typeof $scope.choosePaymentOption === 'function') {
              $scope.choosePaymentOption(true, true);
            }
            if (typeof $scope.afterPaint === 'function' && typeof $scope.sendResizeMessage === 'function') {
              $scope.afterPaint($scope.sendResizeMessage);
            }
          }

          // selection setter (keeps selectedPM, payment.optionType, and UI in sync)
          function setSelectedPM(typeOrKey, opts) {
            opts = opts || {};
            let t = $scope.canon(typeOrKey);
            if ($scope.selectedPM !== t || opts.force) {
              $scope.selectedPM = t;
              $scope.payment.optionType = t; // sync radios and model

              // If the chosen option is not in the first group, auto-reveal "More…"
              let idx = $scope.allOptions.findIndex(function (opt) { return $scope.pmKey(opt) === t; });
              if (idx >= MAX_VISIBLE) $scope.showAllPaymentMethods = true;

              if (!opts.silent) runPMSelectionEffects();
            }
          }

          // one-time init: ONLY preselect when exactly one option
          $scope._pmInitDone = $scope._pmInitDone || false;

          function initSingleOptionSelectionOnce() {
            if ($scope._pmInitDone) return;

            if ($scope.allOptions.length === 1) {
              // Only this case is allowed to auto-select
              setSelectedPM($scope.pmKey($scope.allOptions[0]), { silent: true, force: true });
            } else {
              // Leave unselected when multiple options
              $scope.selectedPM = null;
              $scope.payment.optionType = null;
            }

            $scope._pmInitDone = true;
          }

          initSingleOptionSelectionOnce();

          // If options arrive/change async, run init the first time list becomes non-empty
          $scope.$watchCollection('allOptions', function (list) {
            if (list && list.length && !$scope._pmInitDone) initSingleOptionSelectionOnce();
          });

          // keep programmatic changes in sync, but don't auto-pick on the very first digest
          $scope.$watch('payment.optionType', function (n, o) {
            // Skip if n is null, empty, or same as selected
            if (!n || $scope.canon(n) === $scope.selectedPM) return;
            // Skip if no option/type initialized yet
            if (!$scope.option || typeof $scope.option.type === 'undefined') return;
            if (typeof o === 'undefined' && Array.isArray($scope.allOptions) && $scope.allOptions.length > 1) return;
            setSelectedPM(n);
          });

          // “More …” - reveal everything inline (keyboard accessible)
          $scope.revealMore = function (e) {
            if (e && e.type === 'keydown') {
              let key  = e.key || '';
              let code = e.which || e.keyCode || 0; // 13=Enter, 32=Space
              if (!(code === 13 || code === 32 || key === 'Enter' || key === ' ')) return;
            }
            if (e && e.preventDefault) e.preventDefault();
            if (e && e.stopPropagation) e.stopPropagation();

            $scope.showAllPaymentMethods = true;

            if (typeof $scope.afterPaint === 'function' && typeof $scope.sendResizeMessage === 'function') {
              $scope.afterPaint($scope.sendResizeMessage);
            }
          };
          
          $scope.showAccordionPaymentMethods = function () {
            $scope.lastExpressPaymentMethodUsed = SHOW_OTHER_PAYMENT_METHODS;
            $scope.showLastExpressPaymentMethodUsed = false;
          }

          // radio change - sync and run effects
          $scope.onPMChange = function () {
            let t = ($scope.payment && $scope.payment.optionType != null)
              ? $scope.payment.optionType
              : $scope.selectedPM;

            if (t == null) return;
            setSelectedPM(t); // will no-op if unchanged
          };

          // header click -> select immediately so radio renders checked
          $scope.onHeaderClick = function (typeOrOpt) {
            let key = (typeof typeOrOpt === 'string') ? typeOrOpt : $scope.pmKey(typeOrOpt);
            setSelectedPM(key);
          };

          // ready / animation flags
          $scope.$evalAsync(function () {
            $scope.pmReady = true;  // triggers .is-ready -> fade in
            $timeout(function () { $scope.pmAnimating = false; }, 300); // remove after ~duration
          });
        }

        // ****************** AccordionView Section End ****************** //
      }

      $scope.styleToolTip = function() {
        $scope.tooltip = {};
        if($scope.listPaymentOptions.length === 4) {
          $scope.tooltip.tooltipOverflowOptions = ['purchaseorder']
        }
        if($scope.paymentOptionList.length > 4) {
          $scope.tooltip.tooltipOverflowOptions = ['card','wire','purchaseorder'];
        }
        var count = $scope.listPaymentOptions.length;
        var widthStyles = {
          "1": "100px",
          "2": "102px",
          "3": "102px",
          "4": "74px",
          "5": "58px",
        }
        if (!$scope.isInlineCheckout) {
          if($scope.otherPaymentOptions.length !== 0) {
            $scope.tooltip.tooltipWidth = count > 3 ? widthStyles["5"] : widthStyles[count.toString()];
          }
          else {
            $scope.tooltip.tooltipWidth = count > 5 ? widthStyles["5"] : widthStyles[count.toString()];
          }
        }
      }

      $scope.stylePaymentOptions = function() {
        $scope.paymentOptionsStyle = {};
        var count = $scope.paymentOptionList.length;
        var widthStyles = {
          "1": "100px",
          "2": "108px",
          "3": "107px",
          "4": "77px",
          "5": "60px"
        };
        if($scope.otherPaymentOptions) {
          $scope.paymentOptionsStyle.height = count > 4 ? '36px' : '40px';
          if (!$scope.isInlineCheckout) {
            $scope.paymentOptionsStyle.width = count > 5 ? widthStyles["5"] : widthStyles[count.toString()];
          }
        }
        else {
          $scope.paymentOptionsStyle.height = count > 4 ? '36px' : '40px';
          if (!$scope.isInlineCheckout) {
            $scope.paymentOptionsStyle.width = count > 5 ? widthStyles["5"] : widthStyles[count.toString()];
          }
        }
        $scope.paymentOptionsStyle.iconheight = count > 4 ? '' : '36px';
        $scope.paymentOptionsStyle.iconwidth = count > 4 ? '' : '60px';
        $scope.paymentOptionsStyle.iconPadding = count < 5 && $scope.otherPaymentOptions.length === 0 ? '2px' : '0px';
      }

      $scope.morePaymentOptionsSelected = function() {
        let options = $scope.otherPaymentOptions;
        for (let i = 0; i < options.length; i++) {
          if($scope.threeDotsSelectedWithArrowKeys || options[i].type === $scope.payment.optionType) {
            return true;
          }
        }
      };

      $scope.generateQuoteSelected = function() {
        if( $scope.payment.optionType == 'quote')
          return true;
      };

      $scope.formatTags = function() {
        let tags = [];

        if ($scope.order.tags) {
          let index = 0;
          for (let tag in $scope.order.tags) {
            let tagEntry = {
              key: tag,
              value: String($scope.order.tags[tag])
            };
            tags[index] = tagEntry;
            index++;
          }
        }
        return tags;
      };

      $scope.getQuoteProducts = function(){
        var repeat = true;
        var elem = $scope.groups;

        $scope.itemArr = [];
        $scope.itemObj = {};

        //iterate all items
        $scope.iterate = function(repeat, elem) {
          elem.forEach(function(group) {
            angular.forEach(group.items, function(item, key) {
              if (item.selected === true && group.type !== 'bundle') {
                var itemPeriod;
                var itemIntervalCount = 0;
                if (item.future) {
                  itemPeriod = item.future.intervalUnit;
                  itemIntervalCount = item.future.intervalLength;
                }

                $scope.itemObj = {};
                // populate with data for this item
                $scope.itemObj = {
                  'product': String(item.path),
                  'driver': group.driver != null ? String (group.driver) : null,
                  'quantity': String(item.quantity),
                  'period': itemPeriod,
                  'intervalCount': item.path.includes(".setupFee") ? null : String(itemIntervalCount)
                };
                $scope.itemArr.push($scope.itemObj);
              }

              if (!!item.groups && item.groups.length > 0) {
                $scope.iterate(repeat, item.groups);
              } else {
                repeat = false;
              }
            });
          });
        };
        $scope.iterate(repeat, elem);

        return $scope.itemArr;
      };

      function focusOnFirstInvalidFieldQuotes() {
        $timeout(() => {
          try {
            const container = document.getElementsByClassName('has-error invalid-field-icon')[0];
            if (!container) return;

            const input = container.querySelector('input, select');
            if (input) input.focus();

          } catch (e) {
            logException(e);
          }
        }, 0);
      }

      $timeout(function() {
        if ($scope.isDarkMode && $scope.variables.labelDisplayModePopup === 'default') {
          $scope.labelMode = 'inline';
        }
      });

      var LABEL_CLASS = {
        FLOAT: 'has-float-label',
        INTERNAL: 'label-style-internal',
        STATIC: 'label-style-float-static',
        INLINE: 'label-style-float-inline'
      };
      $scope.LABEL_CLASS = LABEL_CLASS;

      $scope.labelClassMap = {
        'default': LABEL_CLASS.FLOAT,
        'internal': LABEL_CLASS.INTERNAL,
        'static': LABEL_CLASS.STATIC,
        'inline': LABEL_CLASS.INLINE
      };

      // supercel fix they hide the email field in the popup
      function fixEmailVisibility() {
          var contactEmailEl = document.getElementById('contact-email');
          if (contactEmailEl && getComputedStyle(contactEmailEl).display === 'none') {
              var label = contactEmailEl.nextElementSibling;
              if (label && label.tagName === 'LABEL') {
                  label.style.display = 'none';
              }
          }
      }

      $timeout(fixEmailVisibility, 0);

      var observer = new MutationObserver(function(mutations) {
          fixEmailVisibility();
      });

      var observerTarget = document.querySelector('[ng-include*="renderedIframe.html"]') || document.body;
      observer.observe(observerTarget, { childList: true, subtree: true });

      $scope.$on('$destroy', function() {
          observer.disconnect();
      });

      $scope.showEmailError = false;
      $scope.showCardError = false;
      $scope.showCvcError = false;
      $scope.showZipError = false;
      $scope.showRegionError = false;
      $scope.showExpireError = false;

      function checkData(submit) {
        if (!submit) return;
        $scope.updateFormSubmitted(true);
        $scope.checkEmail();
        $scope.checkZipcode();
        $scope.checkRegion();
      }

      $scope.checkEmail = () => checkField($scope.validEmail, 'showEmailError');
      $scope.checkCardField = () => checkField($scope.validCard, 'showCardError');
      $scope.checkExpireField = () => checkField($scope.validExpire, 'showExpireError');
      $scope.checkZipcode = () => checkField($scope.validZip, 'showZipError');
      $scope.checkRegion = () => checkField($scope.validRegion, 'showRegionError');

      function checkField(validatorFn, errorFlag) {
        if (errorFlag === 'showRegionError' && ($scope.country !== 'US' && $scope.country !== 'CA')) {
          $scope[errorFlag] = false;
        }
        if (validatorFn() !== '') {
          $scope[errorFlag] = true;
        }
      }

      $scope.validRegion = function() {
        if (!$scope.formSubmitted) return;
        let region = $scope.contact?.region?.trim();

        // Rules
        // 0. Empty
        if (!region) {
          if($scope.country === 'CA') {
            return "EnterYourProvince"
          }
          return "EnterYourState";
        }

        return "";
      };

      $scope.validEmail = function () {
        if (!$scope.formSubmitted) return;
        const text = $scope.contact?.email?.trim();

        // Rules:
        // 0 empty
        if (!text) return 'EnterYourEmailAddress';

        // 1. only one @
        const parts = text.split('@');
        if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) return 'EnterAValidEmailAddress';

        const local = parts[0];
        const domain = parts[1];

        // 2. No white spaces allow
        if (/\s/.test(text)) return 'EmailMustNotContainSpaces';

        // 3. Consecutive periods
        // 4. Invalid characters
        // 5. Valid email domain
        // 6. Domain must include al least one period
        // 7. Max length
        // 8. Valid TLD (top level domain)
        if (
            text.includes('..') ||
            /[()<>\[\]:;\\,"]/g.test(text) ||
            local.startsWith('.') || local.endsWith('.') ||
            domain.startsWith('.') || domain.endsWith('.') ||
            !domain.includes('.') || domain.endsWith('.') ||
            local.length > 64 ||
            !/^[a-zA-Z]{2,}$/.test(domain.split('.').pop())
        ) {
          return 'EnterAValidEmailAddress';
        }

        return '';
      };

      $scope.validZip = function (str) {
        if (!$scope.formSubmitted) return '';

        let zip = $scope.contact?.postalCode?.trim() || '';
        if ($scope.payment.optionType === 'quote') {
          let el = document.getElementById('recipient-postal');
          zip = el.value;
        }

        let country = $scope.country;

        if (!zip) {
          if (country === 'CA') return 'EnterYourPostalCode';
          if ($scope.payment?.optionType === 'upi') return 'EnterYourPinCode';
          return 'EnterYourZipCode';
        }

        if (country === 'US') {
          if (zip.length < 5) {
            return 'ZipCodeIsTooShort';
          }
          if (!/^[\d-]{5,10}$/.test(zip)) {
            return 'ZipCodeIsInvalid';
          }
          if (zip.length > 10) {
            return 'ZipCodeIsTooLong';
          }
        }

        if (country === 'CA') {
          // Canadian postal code format
          let cleaned = zip.replace(/\s/g, '');
          let validFormat = /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(zip);
          if (zip.length < 6) {
            return 'PostalCodeIsTooShort';
          }
          if (zip.length > 8) {
            return 'PostalCodeIsTooLong';
          }
          if (!validFormat) {
            return 'PostalCodeIsInvalid';
          }
        }

        if ($scope.payment?.optionType === 'upi') {
          // Indian PIN code format
          let validFormat = /^[1-9][0-9]{5}$/.test(zip);
          if (!validFormat) {
            return 'PinCodeIsInvalid';
          }
        }
        if( $scope.hasServerSideError('contact.postalCode')){
            return 'PostalCodeIsInvalid';
        }
        return '';
      };
      //duplicating on this scope handling server side errors
      $scope.hasServerSideError = function(fieldName) {
        if( !$scope._validations){
          return false;
        }
        for( const validation of $scope._validations) {
          if( validation.field == fieldName ){
            return true;
          }
        }
        return false;
      }

      $scope.processZip = function () {
        $scope.disableByKey('zip');

        let zip = $scope.contact?.postalCode?.trim() || '';
        let el;

        if ($scope.payment.optionType === 'quote') {
          el = document.getElementById('recipient-postal');
          zip = el?.value?.trim() || '';
        }

        const country = $scope.country;

        if (country === 'US') {
          let cleaned = zip.replace(/[^0-9\-]/g, '');
          const dashIndex = cleaned.indexOf('-');

          let digits = cleaned.replace(/-/g, '');
          digits = digits.slice(0, 9);

          let formatted = '';
          if (dashIndex === 5 || digits.length > 5) {
            formatted = digits.slice(0, 5);
            if (digits.length > 5) {
              formatted += '-' + digits.slice(5);
            } else if (dashIndex === 5) {
              formatted += '-';
            }
          } else {
            formatted = digits;
          }

          $scope.contact.postalCode = formatted;
          if (el) el.value = formatted;

        } else if (country === 'CA') {
          if (!zip) return;

          let alphanumOnly = zip.toUpperCase().replace(/[^A-Z0-9]/g, '');

          if (alphanumOnly.length >= 6) {
            alphanumOnly = alphanumOnly.slice(0, 3) + ' ' + alphanumOnly.slice(3, 6);
          }

          const formatted = alphanumOnly.slice(0, 8).toUpperCase();
          $scope.contact.postalCode = formatted;
          if (el) el.value = formatted;
        }
      };


      //workaround of scoping mess
      $scope._setServerSideValidations = function(v) {
            $scope._validations = v;
      }

      $scope.disableByKey = function(key) {
        const keyMap = {
          email: 'showEmailError',
          card: 'showCardError',
          expire: 'showExpireError',
          security: 'showCvcError',
          zip: 'showZipError',
          region: 'showRegionError'
        };

        if(key === 'card') {
            removeServerValidationByField($scope._validations, 'card.number');
        }else if(key === 'expire') {
            removeServerValidationByField( $scope._validations, 'card.expiration');
        }else if(key === 'security') {
            removeServerValidationByField( $scope._validations, 'card.security');
        }else{
            removeServerValidationByField( $scope._validations, key );
        }

        const errorFlag = keyMap[key];
        if (errorFlag) {
          $scope[errorFlag] = false;
        }
      }

      $scope.checkTextField = (field) => {
        if (!$scope.formSubmitted) return;
        if ((field.$name === 'contact.addressline1' || field.$name === 'contact.city') && !$scope.isPhysicalAddressRequired()) return false;

        const isEmpty = !field.$modelValue || field.$modelValue === '';
        const fieldName = field.$name;

        // check the correct id in order to add error classes to the corresponding top level element
        const idMap = {
          'contact.firstName': 'contact-first-name',
          'contact.lastName': 'contact-last-name',
          'contact.phoneNumber': 'contact-phone',
          'contact.addressline1': 'contact-addressline1',
          'contact.city': 'contact-city'
        };

        const inputId = idMap[fieldName];
        if (inputId) {
          const inputEl = document.getElementById(inputId);
          if (inputEl && inputEl.parentNode) {
            if (isEmpty) {
              inputEl.parentNode.classList.add('disable-mb');
            } else {
              inputEl.parentNode.classList.remove('disable-mb');
            }
          }
        }

        return isEmpty;
      };

      $scope.isPhysicalAddressRequired = function() {
        return $scope.option.requireShipping || $scope.variables.forcePhysicalAddressCollection == 'true';
      };

      $scope.isPhoneNumberRequired = function() {
          if ($scope.payment && $scope.payment.optionType === 'quote') {
              return false;
          }
          return ($scope.variables && $scope.variables.forcePhoneNumberCollection === 'true') ||
                 ($scope.option && $scope.option.requirePhoneNumber === true);
      };

      $scope.isFieldRequiredForQuote = function () {
        return $scope.payment.optionType === 'quote';
      }

      $scope.generateQuote = function(form) {
        $scope.updateFormSubmitted(true)
        checkData($scope.formSubmitted);
        focusOnFirstInvalidFieldQuotes();
        var recipient = {
          email: $scope.contact.email,
          first: $scope.contact.firstName,
          last: $scope.contact.lastName,
          company: $scope.contact.company,
          phone: $scope.contact.phoneNumber
        };

        var recipientAddress = {
          city: form["recipient.city"].$modelValue,
          postalCode: form["recipient.postalCode"].$modelValue,
          country: $scope.country,
          region: form["recipient.region"].$modelValue,
          addressLine1: form["recipient.addressLine1"].$modelValue,
          addressLine2: form["recipient.addressLine2"].$modelValue
        };

        // use the controller scope variable to pass the tax exempt id in the CreateQuoteRequest
        var data = {
          siteId: $scope.siteId,
          orderSessionId: $scope.session.sblGenerated ? $scope.session.id : null,
          coupon: $scope.couponString,
          currency: String($scope.order.currency),
          recipient: recipient,
          recipientAddress: recipientAddress,
          items: $scope.getQuoteProducts(),
          source: "BUYER",
          tags: $scope.formatTags(),
          taxId: $scope.taxId
        };

        $http({method: 'POST', url: $scope.quoteServiceUrl + 'quotes/buyers', data: data}).then(quoteCreateSuccessHandler.bind(form), quoteCreateErrorHandler);
      };

      function quoteCreateSuccessHandler(response) {
        var result = response.data;
        $scope.quoteId = result.id;
        $scope.expiresOn = result.expires;
        $scope.quoteTo = result.recipient;
        $scope.amount = result.total;
        $scope.currency = result.currency;
        $scope.quoteLink = getBuyerLinkUrl() + 'account/order/quote/' + $scope.quoteId;
        var result = response.data;
        if (result.next == 'error') {
          analyze({
            '_private': true,
            'fsc-exception': {
              'exDescription': 'Payment Error: ' + JSON.stringify(result.messages) + JSON.stringify(result.validation),
              'exFatal': true,
              'appName': 'Payment Flow'
            },
            'fsc-paymentMethod': $scope.paymentOptionType
          });

          $scope.getQuoteGenerateErrors(result);

          $scope.messages = result.messages;
          if (angular.isDefined(result.validation) && result.validation.length > 0) {
            angular.forEach(result.validation, function(o, k) {
              if (o.field in form) { //because we currently collect zip codes 2 ways
                form[o.field].$setValidity('remote-validation', false);
              }
            });
            $scope.invalid = true;
            $scope.addAlertFront('FieldErrors');
          }
        }else {
          $scope.completed = true;
          $timeout( function(){
            document.getElementById('quote-view-btn').click();
          }, 500 );
        }
        $scope.sendResizeMessage();
      }

      function getBuyerLinkUrl() {
        var sessionUrl = window.location.href;
        return sessionUrl.substr(0, sessionUrl.lastIndexOf("session/"));
      }

      function quoteCreateErrorHandler() {
        $scope.addAlert('ErrorServer');
      }

      $scope.applepayPopup = null;
      $scope.goolgepayPopup = null;
      $scope.applePayEmbeddedUrl = "";
      $scope.enableApplePayDeviceLink = false;
      $scope.showApplePayDeviceLink = false;
      $scope.applePayDeivceLinkUrl = "";
      $scope.applePayEmbeddedLoading = true;

      $scope.closeApplePayWindow = function(result){
        try {
          if ($scope.applepayPopup) {
            $scope.applepayPopup.postMessage(result, $scope.session.applePayUrl);
            $scope.applepayPopup = null;
          }
          let applePayiFrame = document.getElementById('apple-pay-iframe');
          if (applePayiFrame){
            applePayiFrame.contentWindow.postMessage({action: result ? result : 'fail'}, applePayiFrame.src);
          }
        } catch(e){
          console.log("Can't close applepay window");
        }
      };

      $scope.openApplePayWindow = function(){
        $scope.messages = [];
        const width = 550;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        if ($scope.applepayPopup && $scope.applepayPopup.closed === false) {
          $scope.applepayPopup.focus();
          return;
        }
        $scope.applepayPopup = window.open($scope.session.applePayUrl, "applepay", "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top);
        // Close ApplePay window if in background
        window.onfocus = function () {
          setTimeout(function() {
            if (document.hasFocus()) {
              $scope.closeApplePayWindow('close');
            }
          }.bind(this), 2000);
        }.bind(this);
      };

      $scope.buildApplePayDeviceLink = function() {
        angular.element(window).ready(function() {
          window.setTimeout(function () {
            let applePayHiddenDiv = document.getElementById("applepayqrcodeHidden");
            if ($scope.applePayDeivceLinkUrl) {
              return;
            }
            if (applePayHiddenDiv != null) {
              // Build URL
              let url = $scope.origin;
              url = url.indexOf("?") > 0 ? url + "&" : url + "?";
              url = url + "fscNext=fsc:invoke:session&fscSession=" + $scope.session.id;
              new QRCode(applePayHiddenDiv, url);
              window.setTimeout(function () {
                if (applePayHiddenDiv.children.length > 1) {
                  $scope.applePayDeivceLinkUrl = applePayHiddenDiv.children.item(1).src;
                }
              }, 500);
            }
          }, 100);
        });
      }

      $scope.closeGooglePayWindow = function(result){
        try {
          if ($scope.googlepayPopup) {
            $scope.googlepayPopup.postMessage(result, $scope.session.googlePayUrl);
            $scope.googlepayPopup = null;
          }
        } catch(e){
          console.log("Can't close googlepay window");
        }
      };

      $scope.openGooglePayWindow = function(){
        const width = 600;
        const height = 600;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        if ($scope.googlepayPopup && $scope.googlepayPopup.closed === false) {
          $scope.googlepayPopup.focus();
          return;
        }
        $scope.googlepayPopup = window.open($scope.session.googlePayUrl, "googlepay", "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top);
        // Close GoolgePay window if in background
        window.onfocus = function () {
          setTimeout(function() {
            if (document.hasFocus()) {
              $scope.closeGooglePayWindow('close');
            }
          }.bind(this), 2000);
        }.bind(this);
      };

      $scope.openDiscountIframe = function(option) {
        if (typeof option === 'undefined' || option === null || !option.hasOwnProperty('lightbox')) {
          return;
        }

        var url = option.lightbox.url;
        try {
          var widgetTitlePhrase = option.type.charAt(0).toUpperCase() + option.type.slice(1);
        } catch (e) {
          debug("error", e);
        }

        $scope.discountDialog = $scope.openWidget({
          'widgetTitlePhrase': widgetTitlePhrase,
          'url': url,
          'widgetWidth': 400,
          'widgetHeight': 620,
          'windowClass': 'discountIframe remove-transform'
        });
      };

      //maybe move this outside controller?
      window.addEventListener("message", $receiveMessage.bind({scope:$scope, timeout:$timeout}), false);

      //keyup is needed for popup animation to top
      $scope.keyup = function(keyEvent) {
        if (keyEvent.keyCode === 27) {
          if (!$scope.modalEvent.isOpen && !$scope.isInlineCheckout) {
            $scope.popupClose();
          }
        }
      };

      //Allow keyboard navigation between payment methods
      $scope.handlePaymentMethodKeyboardNavigation = function (keyEvent) {
        let arrowLeft = keyEvent.code === "ArrowLeft";
        let arrowUp = keyEvent.code === "ArrowUp";
        let arrowRight = keyEvent.code === "ArrowRight";
        let arrowDown = keyEvent.code === "ArrowDown";
        let space = keyEvent.code === "Space";
        let enter = keyEvent.code === "Enter";
        let tab = keyEvent.code === "Tab";

        let allPaymentOptionsArray = Array.from(document.getElementsByName("payment-option-type"))
        let selectedPaymentOption = allPaymentOptionsArray.find(option => option === keyEvent.target);
        let isArrowOrSelectionKey = arrowLeft || arrowUp || arrowRight || arrowDown || space || enter;
        let isOtherPaymentOptionCurrentlySelected = $scope.arrowKeyOtherSelectedOption !== undefined && $scope.arrowKeyOtherSelectedOption !== "";

        //ns-popover creates multiple elements with the same popover id (paymentMethodsPopover) after opening or closing it, if there's at least 1 visible it means the modal is open
        let isOtherPaymentMethodsModalOpen = Array.from(document.querySelectorAll('#paymentMethodsPopover')).find(element => element.style.display !== "none");
        let threeDotsOption = $scope.getThreeDotsElement();

        if (!isArrowOrSelectionKey) {
          //If TAB is pressed while the "Other payment methods" modal is open, the expected behavior is to deselect the three dots + select the currently active payment method
          if (tab && isOtherPaymentMethodsModalOpen && threeDotsOption) {
            keyEvent.preventDefault(); //Prevent the focus from going to the first element in the DOM (caused by ns-popover)
            $scope.queueElementClick(threeDotsOption);
            $scope.threeDotsSelectedWithArrowKeys = false;
            $scope.arrowKeyOtherSelectedOption = "";
            allPaymentOptionsArray.find(element => element.value === $scope.payment.optionType)?.focus();
          }
          return;
        }

        //The payment options are all radio buttons, and by default you could move between them using the arrow keys
        //This behavior needs to be prevented, so it can be fully controlled below
        keyEvent.preventDefault();

        //Handle horizontal movement between payment options with arrow keys
        if (!isOtherPaymentOptionCurrentlySelected) {
          if (arrowRight && !$scope.threeDotsSelectedWithArrowKeys) {
            let nextOption = allPaymentOptionsArray[allPaymentOptionsArray.indexOf(selectedPaymentOption) + 1]
            if (nextOption) {
              if (nextOption.value === "more-options") {
                nextOption.focus()
                $scope.threeDotsSelectedWithArrowKeys = true;
              } else {
                $scope.queueElementClick(nextOption)
              }
            }
          } else if (arrowLeft) {
            let previousOption = allPaymentOptionsArray[allPaymentOptionsArray.indexOf(selectedPaymentOption) - 1]
            if (previousOption) {
              $scope.threeDotsSelectedWithArrowKeys = false;
              $scope.queueElementClick(previousOption)
              previousOption.focus()
            }
          }
        }

        //Handle vertical movement (using arrow keys) + selection (using space or enter) between the other payment options
        if ($scope.threeDotsSelectedWithArrowKeys) {
          if (!isOtherPaymentMethodsModalOpen && (space || enter)) {
            $scope.queueElementClick(threeDotsOption); //Open the "Other payment methods" modal
          }

          //Scroll through the "Other payment methods" list
          if (isOtherPaymentMethodsModalOpen) {
            if (isOtherPaymentOptionCurrentlySelected) {
              let currentSelectionIndex = $scope.otherPaymentOptions.indexOf($scope.arrowKeyOtherSelectedOption);

              if (arrowDown) {
                let nextOption = $scope.otherPaymentOptions[currentSelectionIndex + 1]
                $scope.arrowKeyOtherSelectedOption = nextOption ? nextOption : $scope.arrowKeyOtherSelectedOption
                allPaymentOptionsArray.find(option => option.value === $scope.arrowKeyOtherSelectedOption.type).focus()
              } else if (arrowUp) {
                let previousOption = $scope.otherPaymentOptions[currentSelectionIndex - 1]
                $scope.arrowKeyOtherSelectedOption = previousOption ? previousOption : $scope.arrowKeyOtherSelectedOption
                allPaymentOptionsArray.find(option => option.value === $scope.arrowKeyOtherSelectedOption.type).focus()
              } else if (space || enter) {
                $scope.queueElementClick(allPaymentOptionsArray.find(option => option.value === $scope.arrowKeyOtherSelectedOption.type))
                $scope.threeDotsSelectedWithArrowKeys = false
                $scope.arrowKeyOtherSelectedOption = ""
              }
            } else {
              if (arrowDown) {
                $scope.arrowKeyOtherSelectedOption = $scope.otherPaymentOptions[0]
                allPaymentOptionsArray.find(option => option.value === $scope.otherPaymentOptions[0].type).focus()
              }
            }
          }
        }
      }

      // Add a 0ms timeout to the click() event to prevent the $rootScope:inprog angular error when the ng-change event tries to run (caused by the click) before the ng-keydown event finishes
      // this timeout schedules the click() event to run right after the ongoing one
      $scope.queueElementClick = function(element) {
        if (element) {
          $timeout(function() {
            element.click();
          }, 0);
        }
      }

      $scope.getThreeDotsElement = function () {
        let template = $scope.getPaymentMethodInclude();
        let elementId = 'more-payment-methods-option-legacy';

        if (template === 'paymentMethodsDarkMode.html') {
          elementId = 'more-payment-methods-option-dark-mode'
        } else if (template === 'paymentMethods.html') {
          elementId = 'more-payment-methods-option'
        }

        return document.getElementById(elementId);
      }

      $scope.handleOtherPaymentFocusLost = function (event) {
        if (event.relatedTarget && event.relatedTarget.name !== "payment-option-type") {
          $scope.threeDotsSelectedWithArrowKeys = false;
          $scope.arrowKeyOtherSelectedOption = "";
        }
      }

      $scope.popupClose = function _popupClose() {
        // Only want to callParent once. popupClose can be called twice by unload event, hitting esc, or clicking x
        if (_popupClose.isClosed) {
          return;
        } else {
          _popupClose.isClosed = true;
        }

        if (document.getElementById('locale-container')) {
          document.getElementById('locale-container').style.top = "-40px";
          document.getElementById('locale-container').style.opacity = 0;
        }
        if (document.getElementById('compliance')) {
          document.getElementById('compliance').style.marginTop = "-20px";
        }
        if ($scope.paymentModal) {
          $scope.paymentModal.dismiss('cancel');
        }

        $scope.callParent({
          'action': 'close'
        });

      };

      $scope.replaceSessionState = function() {};

      // add a variable to the controller's scope to store the user input for tax exemption id
      $scope.taxId = '';
      $scope.taxExemptDialog = false;

      $scope.showTaxExemptDialog = function() {
        $scope.taxExemptDialog = !$scope.taxExemptDialog;

        $scope.fields = {
          'taxExemptId': '',
          'state': '',
          'vatCountryList': ['KR']
        };

        $scope.submitVatId = function(hidePopover) {

          var normalizedtaxExemptId;
          var state = $scope.contact.region;
          var country = $scope.country;
          var taxExemptId = $scope.fields.taxExemptId !== undefined ? $scope.fields.taxExemptId : "";
          if (country != 'US' || state == null || state == "" || state === undefined) {
            normalizedtaxExemptId = taxExemptId;
          } else if (taxExemptId !== undefined && taxExemptId !== null && taxExemptId !== "") {
              normalizedtaxExemptId = state.concat("-").concat(taxExemptId);
          }
          taxExemptId = normalizedtaxExemptId;
          if (taxExemptId == null && country == 'US'){
            taxExemptId = state.concat("-");
          }
          let data = {
            taxExemptId: taxExemptId
          };
          $scope.http('POST', '/exempt', data, function(result) {
            $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
            $scope.refreshOrderResponse(result, true, true);
            $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
            // response from /exempt does not have the tax exempt id which is why we use the controller scope variable above
            $scope.taxId = taxExemptId;
            let countryStateKey = country + "-" + state;
            let isInvalidZipCode = $scope.messages.find(message => message.phrase === 'AddressInvalid');
            if(isInvalidZipCode){
              $scope.taxExemptMessage = [];
            }else {
              if (state && state.length > 0 && country == 'CA' && result.taxExemptMessages[countryStateKey]) {
                $scope.taxExemptMessage = result.taxExemptMessages[countryStateKey];
              } else {
                $scope.taxExemptMessage = result.taxExemptMessages[country];
              }
              if ($scope.taxExemptMessage != undefined && $scope.taxExemptMessage.type == 'info') {
                $scope.showTaxExemptedLabel = true;
              } else {
                $scope.fields.taxExemptId = '';
                $scope.showTaxExemptedLabel = false;
              }
            }
          });
          if (hidePopover) {
            hidePopover();
          }

          $scope.taxExemptDialog = false;
        };

      };

      $scope.choosePayment = function(hidePopover) {
        $scope.fields = {
          'taxExemptId': ''
        };
        if (hidePopover) {
          hidePopover();
        }
      };

      $scope.pluralize = subscriptions.pluralize;
      $scope.germanJede = helpers.germanJede;

      $scope.hasCouponInvalidMessage = (messages) => {
        let hasInValidCouponMessage = messages.some(el => el.phrase == 'CouponInvalid');
        let hasTrialNotAllowed = messages.some(el => el.phrase == 'CouponTrialNotAllowed');
        setTimeout(() => {
          const ariaMsg = document.getElementById('coupon-aria-message');
          const sourceMsg = document.getElementById('invalid-coupon-message-source');
          if (ariaMsg && sourceMsg) {
              ariaMsg.textContent = sourceMsg.textContent;
          }
        }, 500);
        return hasInValidCouponMessage || hasTrialNotAllowed;
      }
      $scope.hasValidCoupon = false;
      $scope.removeRequestCalled = false;

      $scope.callParent = function(data) {
        (window.opener || window.parent).postMessage({
          'fscPopupMessage': data
        }, "*");
      };

      $scope.showNextToDriver = function(item, innerGroup) {
        if (($scope.variables[$scope.variablesMap[$scope.page].upSellsPosition] == 'belowdriver') && (innerGroup.type == 'replace') ||
          ($scope.variables[$scope.variablesMap[$scope.page].crossSellsPositionProduct] == 'belowdriver') && (innerGroup.type == 'add')) {
          // It's defenitely not storefront level item
          if (item.path == innerGroup.driver) {
            innerGroup.showNextToDriver = true;
            return true;
          }
        } else {
          return false;
        }
      };

      // returns true if free
      $scope.priceFree = function(num) {
        const priceStr = num.replace(/\,/g, '.').replace(/[^0-9.]/g, '')
        return (parseFloat(priceStr) - 0) < 0.00001
      };

      $scope.applyUsCharge = function(total) {
        return !$scope.priceFree(total) && $scope.country === 'US';
      };

      $scope.hasMultipleRebillDetails = function(){
        if($scope.itemsArray.orderSubscriptions[0]){
          if($scope.itemsArray.orderSubscriptions[0].subscription.instructions) {
            return $scope.itemsArray.orderSubscriptions[0].subscription.instructions.length > 1;
          }
        }
        return false;
      };

      $scope.singleItemHasMultipleRebillDetails = function(item){
        if(item.subscription){
          if(item.subscription.instructions) {
            return item.subscription.instructions.length > 1;
          }
        }
        return false;
      };

      $scope.customColor = function(color) {
        return {
          "background-color": color.valueOf()
        };
      };

      window.trackInitialPageView = function() {

        $scope.itemArr = [];
        $scope.itemObj = {};

        var repeater = true;
        var elem = $scope.groups;

        $scope.iterateOverItems = function(repeat, elem) {

          elem.forEach(function(group) {
            angular.forEach(group.items, function(item, key) {

              $scope.itemObj.name = String(item.display);
              $scope.itemObj.id = String(item.path);
              $scope.itemObj.price = String(item.unitPriceValue);

              $scope.itemArr.push($scope.itemObj);

              // reset itemObj otherwise it writes the last product every time :)
              $scope.itemObj = {};

              if (!!item.groups && item.groups.length > 0) {
                $scope.iterateOverItems(repeat, item.groups);
              } else {
                repeat = false;
                return;
              }
            });
          });
        };
        $scope.iterateOverItems(repeater, elem);

        if ($scope.page == 'list') {
          if (window.storefront.length > 0) {
            window.urlOverride = '/storefront';
          } else {
            window.urlOverride = '/';
          }
        }

        if ($scope.page == 'product') {
          if (window.storefront.length > 0) {
            window.urlOverride = '/storefront/product';

          } else {
            window.urlOverride = '/product';
          }
        }

        if ($scope.page == 'session') {
          if (window.storefront.length > 0) {
            window.urlOverride = '/storefront/session';

          } else {
            window.urlOverride = '/session';
          }
        }

        var aObject = {
          'fsc-url': window.location.href,
          'fsc-referrer': document.referrer,
          'fsc-url-override': window.urlOverride,
          'fsc-currency': String($scope.order.currency),
          'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
          'ecommerce': {
            'currencyCode': String($scope.order.currency),
            'impressions': $scope.itemArr
          }
        };

        $scope.localAnalyze(aObject);

        $scope.countRelatedItems();

        if ($scope.events !== null && $scope.events.length > 0) {

          analyze({
            '_browserhooks': $scope.events
          });

        }

      };

      $scope.GAaddProductsInCart = function() {
        //Ecommerce
        var repeat = true;
        var elem = $scope.groups;

        $scope.itemArr = [];
        $scope.itemObj = {};

        //iterate all items
        $scope.iterate = function(repeat, elem) {
          elem.forEach(function(group) {
            angular.forEach(group.items, function(item, key) {
              // it's checkout, we only need selected //

              if (item.selected === true) {
                //reset item object
                $scope.itemObj = {}

                // populate with data for this item
                $scope.itemObj = {
                  'name': String(item.display),
                  'id': String(item.path),
                  'price': String(item.unitPriceValue),
                  'quantity': String(item.quantity)
                }
                if (item.future && item.future.intervalUnit == "adhoc") {
                  $rootScope.containsAdhoc = true;
                }
                if (item.future) {
                  $rootScope.containsSub = true;
                }
                $scope.itemArr.push($scope.itemObj);
              }

              if (!!item.groups && item.groups.length > 0) {
                $scope.iterate(repeat, item.groups);
              } else {
                repeat = false;
                return;
              }
            });
          });
        };
        $scope.iterate(repeat, elem);

        return $scope.itemArr;

      };

      $scope.GAsend = function(step, action, messageScope) {
        if ($scope.GAsend.steps.indexOf(step) > -1) {
          return;
        }

        $scope.itemArr = $scope.GAaddProductsInCart();

        $scope.localAnalyze({
          'event': 'FSC-checkoutStep' + step,
          'fsc-url': window.location.href,
          'fsc-referrer': document.referrer,
          'fsc-currency': String($scope.order.currency),
          'fsc-eventCategory': 'Checkout',
          'fsc-eventAction': action + (messageScope ? [' (', messageScope, ')'].join('') : ' (Payment Window)'),
          'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
          'ecommerce': {
            'currencyCode': String($scope.order.currency),
            'checkout': {
              'actionField': {
                'step': step,
                'option': action + (messageScope ?  [' (', messageScope, ')'].join('') : ' (Payment Window)')
              },
              'products': $scope.itemArr
            }
          }
        });

        $scope.GAsend.steps.push(step);
      };
      $scope.GAsend.steps = [];

      $scope.sendNameGa = function(form1, form2) {
        try {
          if (form1.$valid && form2.$valid) {
            $scope.GAsend(2, 'Name Entered');
          }
        } catch (e) {}
      };

      $scope.sendEmailGa = function(form) {
        if (form.$valid) {
          $scope.GAsend(3, 'Email Entered');
        }
      };

      $scope.sendCardGa = function(form1, form2, form3) {
        try {
          if (form1.$valid && form2.$valid && form3.$valid ) {
            $scope.GAsend(4, 'Payment Data Entered');
          }
        } catch (e) {}
      };

      $scope.sendPostalCodeGa = function(form) {
        if (form.$valid) {
          $scope.GAsend(6, 'Postal Code Entered');
        }
      };

      $scope.cdnLink = "https://cdn.onfastspring.com/themes/images/payment";

      $scope.cvvDark = function () {
        return $scope.cdnLink + 'cvv-dark.svg';
      }
      const VISA = $scope.cdnLink + "/visa.png";
      const MASTERCARD = $scope.cdnLink + "/mastercard.png";
      const AMEX = $scope.cdnLink + "/amex.png";
      let JCB = $scope.cdnLink + "/JCB-Transparent.png";
      const UNIONPAY = $scope.cdnLink + "/unionpay.png";
      const DISCOVER = $scope.cdnLink + "/discover.png";

      $scope.cardImagesFixed = function() {

        const CARDS_US = [VISA, MASTERCARD, AMEX, DISCOVER];
        const CARDS_JP = [JCB, VISA, MASTERCARD];
        const CARDS_CN = [UNIONPAY, VISA, MASTERCARD];
        const CARDS_DEFAULT = [VISA, MASTERCARD, AMEX];

        switch ($scope.country) {
          case 'US': return CARDS_US;
          case 'JP': return CARDS_JP;
          case 'CN': return CARDS_CN;
          default:   return CARDS_DEFAULT;
        }
      }

      $scope.cardImagesRotative = function() {
        const CARDS_US = [];
        const CARDS_JP = [AMEX, DISCOVER, UNIONPAY];
        const CARDS_CN = [AMEX, JCB, DISCOVER];
        const CARDS_DEFAULT = [JCB, DISCOVER, UNIONPAY];

        switch ($scope.country) {
          case 'US': return CARDS_US;
          case 'JP': return CARDS_JP;
          case 'CN': return CARDS_CN;
          default:   return CARDS_DEFAULT;
        }
      }

      // Function to dynamically update the margins of card elements to handle external CSS modifications.
      $scope.updateMarginsDynamically = function () {
        $timeout(function() {
          // Sellers might modify the CSS of inputs, which can break the layout of cards and CVC icons.
          // We use recursion to continuously check for margin changes and apply them dynamically.

          var cardNumber = document.getElementById('card-number');
          var cardsCarouselContainer = document.getElementById('cards-carousel');
          var cardCvc = document.getElementById('cvc-holder');

          if (cardNumber && cardsCarouselContainer) {
            const computedStyle = window.getComputedStyle(cardNumber);

            // Apply computed margins dynamically to maintain proper alignment.
            cardsCarouselContainer.style.marginTop = computedStyle.marginTop;
            cardsCarouselContainer.style.marginBottom = computedStyle.marginBottom;

            // Apply to CVC container only if it exists.
            if (cardCvc) {
              cardCvc.style.marginTop = computedStyle.marginTop;
              cardCvc.style.marginBottom = computedStyle.marginBottom;
            }
          }
        }, 0);
      };

      $scope.checkCardElementReady = function () {
        return !!document.getElementById('card-number');
      };

      $scope.$watch($scope.checkCardElementReady, function (isReady) {
        if (isReady) {
          $scope.updateMarginsDynamically();
        }
      });

      $scope.currentIndex = 0;

      // Function to infinitely rotate cards for smooth transitions using the DOM.
      $scope.rotateCards = function() {
        $scope.rotationTimeout =  setTimeout(function() {
          // Retrieve the list of rotating card images based on the current theme mode.
          const cards = $scope.cardImagesRotative($scope.isDarkMode);

          // Ensure there are cards available before updating the index.
          if (cards.length > 0) {
            $scope.$apply(function() {
              // Update the current index cyclically to rotate through the cards.
              $scope.currentIndex = ($scope.currentIndex + 1) % cards.length;
            });
            // Recursively call rotateCards to keep the rotation ongoing.
            $scope.rotateCards();
          }
        }, 2000);
      };

      $scope.stopRotateCards = function() {
        if ($scope.rotationTimeout) {
          clearTimeout($scope.rotationTimeout);
          $scope.rotationTimeout = null;
        }
      };

      $scope.rotateCards();

      $scope.BtnClass = function(type) {
        var btnClass = '';
        if (type == 'replace') {
          return $scope.variables.upSellActionBtn;
        } else if (type == 'add') {
          return $scope.variables.crossSellActionBtn;
        }
      };

      /**
       * Single method to handle all interactions.
       */
      // noRefresh parameter is optional and added for case when loading icon should be hidden
      $scope.http = function(method, path, data, success, fail, noRefresh) {
        if (typeof noRefresh == 'undefined' || noRefresh == false) {
          startUpdate();
        }
        var config = {
          method: method,
          url: env.lastSessionUrl + path,
          headers: {
            'X-Session-Token': env.lastSessionToken
          },
          data: data
        };
        $http(config)
          .then(function(response) {
            var result = response.data,
              status = response.status,
              headers = response.headers,
              config = response.config,
              url = headers('X-Session-Location'),
              token = headers('X-Session-Token');
            if (url != null && url.length > 0 && url != env.lastSessionUrl) {
              env.lastSessionUrl = url;
            }
            if (token != null && token.length > 0) {
              env.lastSessionToken = token;
            }
            success(result);

          }, function(response) {
            var result = response.data,
              status = response.status,
              headers = response.headers,
              statusText = response.statusText,
              config = response.config;

            analyze({
              '_private': true,
              'fsc-exception': {
                'exDescription': status + ' ' + statusText,
                'exFatal': true,
                'appName': path
              },
              'fsc-paymentMethod': $scope.option.type
            });
            if (result == 'token-mismatch') {
              // Typical case:  back button from paypal.
              $scope.showWaitDialog('WaitRedirectTitle', 'WaitRedirectAbout');
              location.reload(true);
            } else {
              $scope.messages = [{
                type: 'danger',
                phrase: 'Unexpected'
              }];
              if (angular.isDefined(fail)) {
                fail(result);
              }
            }

          })['finally'](endUpdate);
      };

      $scope.addAlert = function(msg) {
        $scope.messages.push({
          phrase: msg
        });
      };

      $scope.closeMessage = function(index) {
        $scope.messages.splice(index, 1);
      };

      $scope.filterPaymentOptionWithVariants = function(option) {
        return option.variants != null && option.variants.length > 0;
      };

      $scope.filterPaymentOptionWithoutVariants = function(option) {
        return option.variants === null || option.variants.length === 0;
      };

      $scope.enabledForGift = ['card', 'paypal', 'amazon'];

      $scope.isPaymentMethodEnabled = function(paymentOption) {
        if ($scope.recipient && $scope.recipient.selected && $scope.variables.enableGiftPurchases === 'true') {
          return $scope.enabledForGift.indexOf(paymentOption) > -1;
        }
        // condition for when subscriptions are added to cart we need to display the necessary payment options
        var paymentList = $scope.paymentOptionList;
        if ( $scope.subscriptionCheckbox.display === true) {
          for(var i = 0; i < paymentList.length; i++) {
            if(paymentList[i].type === paymentOption){
              return true;
            }
          }
          return false;
        }
        return true;
      };

      $scope.getPaymentTypeKey = function(option) {
        if ((option.type === 'pix' || option.type === 'upi') && option.supportRecurring) {
          var isRecurringOrder = $scope.subscriptionCheckbox.autoRenew ||
                                 ($scope.hasRecurring && !$scope.subscriptionCheckbox.display) ||
                                 $scope.hasManagedSubscription;
          if (isRecurringOrder) {
            return 'PaymentType.' + option.type + '.recurring';
          }
        }
        return 'PaymentType.' + option.type;
      };

      $scope.isMorePaymentOptionsEnabled = function() {
        var otherPayments = $scope.otherPaymentOptions;
        if ($scope.recipient && $scope.recipient.selected && $scope.variables.enableGiftPurchases === 'true') {
            for(var i = 0; i < otherPayments.length; i++) {
              if($scope.enabledForGift.indexOf(otherPayments[i].type) > -1) {
                //when true also add test case that adds to listPaymentOptions
                //this will only happen if any of the payment options in otherPaymentOptions need to be placed in listPaymentOptions
                return true;
              }
            }
            return false;
        }
        if ($scope.subscriptionCheckbox.display === true) {
          if($scope.otherPaymentOptions.length === 0) {
            return false;
          }
        }
        //call check max payment options function
        return true;
      }

      //Used to update autoRenew and subscriptionCheckbox to the correct state after reloading the storefront view so the selected payment option and the checkbox state match.
      //To prevent, for example, auto renew PO subscriptions
      $scope.updateAutoRenew = function(){
        if ($scope.variables.subscriptionAutoRenew !== 'manual' && $scope.paymentOptionList && $scope.paymentOptionList.length > 0 && $scope.paymentOptionList[0].type !== 'free' && $scope.totalValue > 0 && $scope.hasRecurring){
          if($scope.option && !$scope.option.supportRecurring){
            $scope.subscriptionCheckbox.autoRenew = false;
            $scope.subscriptionCheckbox.display = false;
          } else {
            $scope.subscriptionCheckbox.display = $scope.variables.subscriptionAutoRenew != "auto";
            if($scope.variables.subscriptionAutoRenew === 'auto'){
              $scope.subscriptionCheckbox.autoRenew = $scope.variables.subscriptionAutoRenew != "opt-manual";
            }
          }
        }
        if (!$scope.savedPaymentMethod && $scope.variables.enableOneClickPayment) {
          if($scope.hasPerpetualProduct(createItemsArray($scope.groups))){
            let isAutoRenewEnabled = ($scope.variables.subscriptionAutoRenew && $scope.variables.subscriptionAutoRenew.includes('auto')) ? true : false;
            if ($scope.payment.optionType === "card") {
              $scope.subscriptionCheckbox.display = true;
              $scope.subscriptionCheckbox.autoRenew = isAutoRenewEnabled;
            } else if ($scope.payment.optionType === "paypal" || $scope.payment.optionType === "applepay" || $scope.payment.optionType === "googlepay") {
              // this logic was added to solve TNP-26309, applepay and googlepay were added to this logic
              $scope.subscriptionCheckbox.display = false;
              $scope.subscriptionCheckbox.autoRenew = isAutoRenewEnabled;
            } else if (($scope.payment.optionType === "pix" || $scope.payment.optionType === "upi") && $scope.option && $scope.option.supportRecurring) {
              // PIX/UPI: autoRenew determines routing (Automatico vs one-time), not just payment saving.
              // Only set true when cart actually has subscriptions - isAutoRenewEnabled should not
              // trigger recurring flow for pure perpetual purchases (unlike cards/PayPal).
              $scope.subscriptionCheckbox.display = false;
              $scope.subscriptionCheckbox.autoRenew = $scope.hasRecurring;
            } else {
              $scope.subscriptionCheckbox.display = false;
              $scope.subscriptionCheckbox.autoRenew = false;
            }
          }
        }
      }

      $scope.showSubscriptionCheckboxForProducts = function (){
        if (!$scope.savedPaymentMethod && $scope.variables.enableOneClickPayment) {
          if($scope.hasPerpetualProduct(createItemsArray($scope.groups))){
            if ($scope.payment.optionType == "card") {
              $scope.subscriptionCheckbox.display = true;
            }else{
              $scope.subscriptionCheckbox.display = false;
            }
          }
        }
      }

      $scope.isInvoicePayment = function() {
        if ($scope.invoiceUrl == undefined) {
          return false;
        } else if ($scope.invoiceUrl != null) {
          return true;
        }
        return false;
      }

      $scope.callSetPaymentOptions = function() {
        // This flag is only used by stores with Payment Hierarchy enabled. It will be true by default.
        $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
        $scope.setPaymentOptions();
        // reset the flag,it only changes to false when the user clicks on the Save payment method checkbox.
        $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
      };

      var paymentOptionsSupportRecurring, paymentOptionsNonRecurring, freePaymentMethod;
      $scope.setPaymentOptions = function() {
        let hasSubscriptionProduct = $scope.hasRecurring;
        let autoAddPaymentMethods = [];

        if ($scope.subscriptionCheckbox.display && !$scope.subscriptionCheckbox.autoRenew && $scope.totalValue === 0 && freePaymentMethod) {
          // Free products
          $scope.paymentOptionList = [freePaymentMethod];
        } else if ($scope.isInvoicePayment()) {
          // For paying a PO/Quote, show all (subscriptions/perpetual)
          // if there is atleast one managed subscription in the cart, and this is invoice payment - do not show non-recurring.
          if (!!$scope.hasManagedSubscription) {
            $scope.paymentOptionList = paymentOptionsSupportRecurring;
          } else {
            $scope.paymentOptionList = paymentOptionsNonRecurring;
          }
        } else if (hasSubscriptionProduct) {
          // Subscription Rules
          if ($scope.variables.subscriptionAutoRenew === 'manual' && !$scope.forceFuture) {
            $scope.paymentOptionList = $scope.totalValue > 0 ? paymentOptionsNonRecurring : paymentOptionsSupportRecurring;
          } else if ($scope.variables.subscriptionAutoRenew === 'auto') {
            $scope.paymentOptionList = paymentOptionsSupportRecurring;
            if ($scope.totalValue > 0) {
              autoAddPaymentMethods.push('purchaseorder'); // Add PO to the list of payment methods
              autoAddPaymentMethods.push('quote'); // Add Quote to the list of payment methods
            }
          } else if ($scope.subscriptionCheckbox.autoRenew === false) {
            $scope.paymentOptionList = paymentOptionsNonRecurring;
          } else {
            $scope.paymentOptionList = paymentOptionsSupportRecurring;
          }
        } else {
          // Perpetual Products
          $scope.paymentOptionList = paymentOptionsNonRecurring;
        }

        // Add the auto added items
        paymentOptionsNonRecurring.forEach(option => {
            if(autoAddPaymentMethods.indexOf(option.type) >= 0){
              if(!$scope.paymentOptionList.includes(option)){
                $scope.paymentOptionList.push(option)
              }
            }
          });


        // TNP-11036 changing the order of payment methods to prominently present sepa when enabled
        if (!$scope.variables.paymentMethodOrder && $scope.paymentOptionList.some(element => element.type === 'sepa')) {
          for(let i = 0; i < $scope.paymentOptionList.length; i++){
            if ($scope.paymentOptionList[i].type === 'sepa') {
              let paymentPriority = $scope.paymentOptionList[i];
              $scope.paymentOptionList.splice(i, 1);
              $scope.paymentOptionList.splice(1, 0, paymentPriority);
            }
            if ($scope.paymentOptionList[i].type === 'purchaseorder') {
              let paymentPriority = $scope.paymentOptionList[i];
              $scope.paymentOptionList.splice(i, 1);
              $scope.paymentOptionList.push(paymentPriority);
            }
          }
        }

        var paymentOptionFound = false;
        for (var i = 0; i < $scope.paymentOptionList.length; i++) {
          var paymentOption = $scope.paymentOptionList[i];
          // if (paymentOption.visible) {
          //   $scope.paymentOptionList.push(paymentOption);
          // }
          if ($scope.option && $scope.option.type === paymentOption.type) {
            paymentOptionFound = true;
          }

          if (paymentOption.type === 'sepa') {
            $scope.reloadPaymentOptionListIfSepaExist = true;
          }
        }
        //paypal redirecting error fix
        if (!paymentOptionFound && typeof $scope.paymentOptionList[0] !== 'undefined') {
          $scope.option = $scope.paymentOptionList[0];
          $scope.payment.optionType = $scope.paymentOptionList[0].type;
          $scope.updateAutoRenew();
        }

        // Sort Payment Methods based on Country
        if ($scope.variables.enablePaymentHierarchyGeoBasedSorting) {
          $scope.sortPaymentOptions();
        }

        // Sort Pre-selected payment method for SBL
        $scope.sortPreSelectedPaymentOptions();

        // pre-select applePay
        if ($scope.variables.enablePaymentHierarchyPreSelectApplePay) {
          $scope.preSelectApplePay();
        }

        // TNP-27368 Fix to display ApplePay QR code if different payment method is pre-selected
        $scope.hideApplePayQRCode();

        //payment options new ui
        $scope.checkMaxPaymentOptions($scope.paymentOptionList);
      };

      $scope.sortPaymentOptions = function () {

        let paymentMethodSortMap;
        let paymentMethodsSortMapByCountry;

        try {
          paymentMethodSortMap = JSON.parse($scope.variables.paymentMethodsSortMap);
          paymentMethodsSortMapByCountry = paymentMethodSortMap[$scope.country];

          // Validate it's an array before proceeding
          if (!Array.isArray(paymentMethodsSortMapByCountry)) {
            return;
          }

          // Create a priority map based on the sorting array
          const priority = {};
          paymentMethodsSortMapByCountry.forEach((type, index) => {
            priority[type] = index;
          });

          const sorted = $scope.paymentOptionList
              .map((item, index) => ({ item, index })) // Keep original index
              .sort((a, b) => {
                const aPriority = priority.hasOwnProperty(a.item.type) ? priority[a.item.type] : Infinity;
                const bPriority = priority.hasOwnProperty(b.item.type) ? priority[b.item.type] : Infinity;

                if (aPriority === bPriority) {
                  return a.index - b.index; // Preserve original relative order
                }
                return aPriority - bPriority;
              })
              .map(entry => entry.item); // Unwrap

          $scope.paymentOptionList = sorted;

          // Pre-select the first payment method
          if ($scope.payment && !$scope.payment.optionTypeBySBL && !$scope.payment.refreshForTaxRequest && $scope.preselectFirstPaymentMethod) {
            $scope.option = $scope.paymentOptionList[0];
            $scope.payment.optionType = $scope.paymentOptionList[0].type;
          }

        } catch (err) {
          console.error("Failed to sort payment options:", err);
          // Leave $scope.paymentOptionList as is — fallback to original
        }
      };

      $scope.sortPreSelectedPaymentOptions = function () {
        // Sort the pre-selected method only for SBL and when the feature flag is enabled
        // Since payment method order takes priority if provided, avoid this sorting as well
        if (!$scope.hasSiteLevelFeatureFlag('payment.methods.sort.preselected') || !$scope.payment.optionTypeBySBL || $scope.variables.paymentMethodOrder) {
          return;
        }

        for (let i = 0; i < $scope.paymentOptionList.length; i++) {
          if ($scope.paymentOptionList[i].type === $scope.payment.optionType) {
            let preSelectedPayOption = $scope.paymentOptionList[i];

            // Show pre-selected payment option first
            $scope.paymentOptionList.splice(i, 1);
            $scope.paymentOptionList.splice(0, 0, preSelectedPayOption);
          }
        }
      }

      $scope.hideApplePayQRCode = function () {
        if ($scope.payment.optionType !== 'applepay') {
          $scope.showApplePayDeviceLink = false;
        }
      }
      
      $scope.isQuotePaymentOptionAvailable = function () {
        return $scope.paymentOptionList && $scope.paymentOptionList.some(option => option.type === 'quote');
      }

      // TNP 18002 Disable or enable ui elements based on type of subscriptions
      let nonTrials = 0;
      let trialWithObl = 0;
      let trialNoObl = 0;
      let paidTrial = 0;

      //TNP 18612 Disable generate quote for free no obl trials
      $scope.containsNoOblProduct = function() {
        $scope.updateTrialProductsCount();
        return trialNoObl > 0;
      }

      $scope.isOnlyFreeTrialItems = function() {
        $scope.updateTrialProductsCount();
        // In the cart we contains trial items complete free and no other kind of items
        return trialNoObl + trialWithObl > 0 && (nonTrials + paidTrial) === 0;
      }

      $scope.isOnlyTrialWithOblProd = function() {
        $scope.updateTrialProductsCount();
        // In the cart we contains trial with obl items and no other kind of items
        return trialWithObl > 0 && (nonTrials + trialNoObl + paidTrial) === 0;
      }

      $scope.isOnlyTrialNoOblProd = function() {
        $scope.updateTrialProductsCount();
        // In the cart we contains trial with obl items and no other kind of items
        return trialNoObl > 0 && (nonTrials + trialWithObl + paidTrial) === 0;
      }

      // Items to Evaluate is used to calculate trial UI elements based on items in the cart
      $scope.itemsToEvaluate = [];

      $scope.resetTrialCounts = function() {
        nonTrials = 0;
        trialWithObl = 0;
        trialNoObl = 0;
        paidTrial = 0;
      }

      $scope.updateTrialProductsCount = function() {
        $scope.resetTrialCounts();

        if( $scope.itemsToEvaluate.length === 0 && $scope.order.groups[0] != null) {
          $scope.itemsToEvaluate = $scope.order.groups[0].items;
        }

        let items = $scope.itemsToEvaluate;
        for (let i in items) {
          let trialType = items[i].subscription != null && items[i].subscription.instructions[0] != null? items[i].subscription.instructions[0].trialType : 'not a trial';
          if (trialType === "FREE_WITHOUT_PAYMENT") {
            trialNoObl++;
          } else if (trialType === "FREE_WITH_PAYMENT"){
            trialWithObl++;
          } else if( trialType === "PAID" ){
            paidTrial++;
          } else {
            nonTrials++;
          }
        }
      }

      $scope.hasShippingFeeAndNoSubscription = function() {
        if(($scope.itemsArray.orderItems.length != 0) && ($scope.itemsArray.orderSubscriptions.length == 0)) {
          for (let i = 0; i < $scope.itemsArray.orderItems.length; i++) {
            if ($scope.itemsArray.orderItems[i].path === "SystemExtension.shippingcalculation"){
              return true;
            }
          }
          return false;
        }
      }

      $scope.trialEndDate = function() {
        return $scope.itemsToEvaluate[0].subscription.instructions[0].periodEndDate;
      }

      $scope.trialDays = function() {
        let initialDateToFormat = new Date($scope.itemsToEvaluate[0].subscription.instructions[0].periodStartDateValue);
        let endDateToFormat = new Date($scope.itemsToEvaluate[0].subscription.instructions[0].periodEndDateValue);

        let difference = endDateToFormat.getTime() - initialDateToFormat.getTime();
        return Math.ceil(difference / (1000 * 3600 * 24) ) + 1;
      }

      $scope.isTrial = function(item, idx=0) {
        let type = item.subscription.instructions[idx].type;
        return type === "trial";
      }

      $scope.isItemFreeTrial = function(item, idx=0) {
        let trialType = item.subscription.instructions[idx].trialType;
        return trialType === "FREE_WITHOUT_PAYMENT" || trialType === "FREE_WITH_PAYMENT";
      }

      $scope.isItemPaidTrial = function(item, idx=0) {
        let trialType = item.subscription.instructions[idx].trialType;
        return trialType === "PAID";
      }

      var reverseCountries = ['CN', 'TW', 'MO', 'JP', 'KR'];

      $scope.setInitialFocus = function () {

        if (isSafari) {
          return;
        }

        setTimeout(function () {
          if ($scope.variables.focusVisiblePrice !== 'true') {
            return;
          }

          var firstFocusElement;
          if (!$scope.isInlineCheckout) {
            if ($scope.variables.showCart === 'true') {
              firstFocusElement = 'btn-show-cart';
            } else {
              firstFocusElement = 'close-payment-modal';
            }
          } else {
            firstFocusElement = ($scope.variables.countrySelector === "visible")
                ? 'locale-btn-inline-checkout'
                : 'contact-email';
          }

          var initialElement = document.getElementById(firstFocusElement);
          if (initialElement) {
            initialElement.focus({ focusVisible: true });
          }
        }, 500);
      };

      $scope.announceLocaleChange = function (countryDisplay, languageDisplay, previousCountry, previousLanguage) {
        if (!isSafari) {
          var announcement = '';

          if (countryDisplay) {
            announcement = $filter('format')($filter('phrase')('RegionChanged'), previousCountry, countryDisplay);
          } else if (languageDisplay) {
            announcement = $filter('format')($filter('phrase')('LanguageChanged'), previousLanguage, languageDisplay);
          }

          const announcementElement = document.getElementById('locale-selection-announcement');

          if (announcementElement) {
            announcementElement.textContent = '';
            setTimeout(function() {
              announcementElement.textContent = announcement;
              announcementElement.focus();
            }, 1000);
          }
        }
      };

      setTimeout(() => {
        if($scope.variables && $scope.variables.focusVisiblePrice && isSafari) {
          document.addEventListener("click", $scope.removeFocusStyle);
          document.addEventListener("focus", $scope.removeFocusStyle);
        }
      }, 500);

      $scope.removeFocusStyle = function (){
        if(document.getElementById("total-label")){
          document.getElementById("total-label").classList.remove('total-focus')
        }
        document.removeEventListener("click", $scope.removeFocusStyle);
        document.removeEventListener("focus", $scope.removeFocusStyle);
      }

      $scope.showTotalLabelFocus = function() {
        return (isSafari && $scope.variables.focusVisiblePrice === 'true');
      }

      $scope.notifyChildIFrames = function(){
        let eventData = {
          action: 'compliance',
          value: !$scope.complianceData.enabled || $scope.complianceData.checked || $scope.enableNewTermsAndPolicy
        }
        let applePayiFrame = document.getElementById('apple-pay-iframe');
        if (applePayiFrame){
          applePayiFrame.contentWindow.postMessage(eventData, applePayiFrame.src);
        }
        let applePayExpressiFrame = document.getElementById('apple-pay-express-iframe');
        if (applePayExpressiFrame){
          applePayExpressiFrame.contentWindow.postMessage(eventData, applePayExpressiFrame.src);
        }
      }

      $scope.refreshPageResponse = function (response, sendRefreshMessageToSBL, resetTaxId) {
        sendRefreshMessageToSBL = sendRefreshMessageToSBL || false;
        env.phrases = response.phrases;
        env.lastSessionToken = response.session.token;
        env.lastSessionUrl = response.session.location;
        env.paymentContact = response.paymentContact; //recognized customer details

        $scope.lastPaymentAttemptStatus = response.lastPaymentAttemptStatus;
        $scope.siteLevelFeatureFlags = response.order.siteLevelFeatureFlags;
        $scope.promotionOptions = response.promotionOptions;
        $scope.variables = response.variables;
        $scope.variables.serverRequestedForcePhysicalAddressCollection = $scope.variables.forcePhysicalAddressCollection;
        $scope.messages = response.messages;
        $scope.taxExemptMessage = [];
        $scope.session = response.session;
        $scope.renewalInvoiceId = response.session.renewalInvoiceId;
        $scope.order = response.order;
        $scope.invoiceUrl = response.order.invoiceUrl;
        $scope.currency = response.order.currency;
        $scope.isGrossPricing = response.grossPricing;
        $scope.isCartSelected = response.cartViewEnabled;
        $scope.isCartViewEnabled = response.cartViewEnabled;
        $scope.orderLevelDiscountEnabled = response.orderLevelDiscountEnabled || false;
        $scope.siftBeaconKey = response.siftBeaconKey;
        $scope.siteId = response.siteId;
        $scope.quoteServiceUrl = response.quoteServiceUrl;
        $scope.paymentServiceUrl = response.paymentServiceUrl;
        $scope.isProduction = response.production;
        $scope.hasQuote = response.hasQuote;
        $scope.showEmptyCartPage = false;
        $scope.realContainerHeight = null;
        $scope.taxId = response.order.taxExemptionId === undefined ? '': response.order.taxExemptionId;
        $scope.savedPaymentMethod = response.order.savedPaymentMethod;
        $scope.pixEligibleForExpressPayment = response.order.pixEligibleForExpressPayment;
        $scope.savedExpressPaymentMethod = null;
        $scope.expressCheckoutButtons = [];
        
        if(resetTaxId) {
          $scope.taxId = response.order.taxExemptionId === undefined ? '' : response.order.taxExemptionId;
          $scope.showTaxExemptedLabel = false;
        }
        $scope.taxExemptDialog = false;
        $scope.enableNewTermsAndPolicy = response.enableNewTermsAndPolicy;
        //display in secure checkout
        $scope.storefrontLink = $scope.session.location.match(/^https?:\/\/[^/]+/);
        if ($scope.storefrontLink) {
          $scope.storefrontLink = $scope.storefrontLink[0];
        }

        $scope.country = response.country;
        if ($scope.complianceData.agreementCountries.indexOf($scope.country) > -1) {
          $scope.mailingList.subscribe = false;
          if(!$scope.enableNewTermsAndPolicy){
            $scope.complianceData.checked = false;
          }
        }
        $scope.complianceData.enabled = $scope.complianceData.agreementCountries.indexOf(response.country) > -1;
        $scope.notifyChildIFrames();
        $scope.countryDisplay = response.countryDisplay;
        $scope.reverseName = reverseCountries.indexOf($scope.country) > -1;
        $scope.origin = response.origin;

        $scope.language = response.language;
        $scope.languageDisplay = response.languageDisplay;
        $scope.defaultLanguage = response.defaultLanguage;
        $scope.countryRequiresPostalCode = response.countryRequiresPostalCode;
        $scope.countryRequiresRegion = response.countryRequiresRegion;
        $scope.validZipCode = response.validZipCode;
        $scope.preselectFirstPaymentMethod = true;
        $scope.refreshOrderResponse(response, sendRefreshMessageToSBL, resetTaxId);
        updatePostalPhrase();
        $scope.currentCountry = response.country;
        $scope.hasAccount = response.hasAccount;
        if ($scope.session?.secondary?.includes('embedded')) {
            $scope.labelMode = $scope.variables.labelDisplayModeInline;
        } else {
            $scope.labelMode = $scope.variables.labelDisplayModePopup;
        }

        $scope.events = response.events || null;

        $scope.applePayButtonHeight = $scope.variables.payButtonHeight ? $scope.variables.payButtonHeight : '48px';
        let buttonHeight = 48;
        try {
          if ($scope.variables.payButtonHeight) {
            buttonHeight = parseInt($scope.variables.payButtonHeight.replace(/[a-zA-Z]/g, ""), 10);
          }
        } catch(pe){
          if (window.Sentry) {
            Sentry.captureException(pe);
          }
        }
        $scope.applePayPadding = Math.max(0, (buttonHeight - 30) / 2);

        if ($scope.events !== null && $scope.events.length > 0) {
          $scope.findHookContainer($scope.events);
        }

        $scope.itemsArray = createItemsArray(response.order.groups); // {orderItems, orderSubscriptionsAdhoc}

        $scope.showAddressField = $scope.option && $scope.option.requireShipping || $scope.variables.forcePhysicalAddressCollection !== 'false';

        $scope.services = $scope.services || {};
        angular.forEach(response.services, function (val, key) {
          if (key && val) {
            $scope.services[key] = val;
          }
        });

        $scope.setInitialFocus();

        try {
          if ($scope.session && $scope.session.fpUrl && $scope.session.riskServiceUrl && $scope.hasSiteLevelFeatureFlag('risk.service') && document.getElementById('fs_buyer_id') == null) {
            const script = document.createElement('script');
            script.id = 'fs_buyer_id';
            script.src =  $scope.session.fpUrl;
            script.profileUrl = $scope.session.riskServiceUrl;
            script.async = true;
            document.head.appendChild(script);
          }
        } catch(re){
          if (window.Sentry) {
            Sentry.captureException(re);
          }
        }
        $scope.renderCaptchaWidget();

        try {
          if (sendRefreshMessageToSBL) {
            let applePayIFrame = document.getElementById("apple-pay-express-iframe");
            if (applePayIFrame) {
              let msg = {action: 'updateSession', session: $scope.session.id};
              applePayIFrame.contentWindow.postMessage(msg, $scope.session.applePayUrl);
            }
          }
        } catch(ee){
          if (window.Sentry) {
            Sentry.captureException(ee);
          }
        }
      };

      $scope.isFieldDisabled = () => {
        return $scope.renewalInvoiceId && $scope.renewalInvoiceId.trim().length > 0;
      };

      $scope.isBackgroundDarkMode = (bgColor) => {
        if ($scope.variables && $scope.variables.imageMode === 'dark') return true;
        if (!bgColor) return false;
        const match = bgColor.match(/^rgb?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!match) return false;
        const [r, g, b] = match.slice(1, 4).map(Number);
        return ((r * 299 + g * 587 + b * 114) / 1000) <= 192.671;
      }


      // Also add to rootScope for global access
      $rootScope.trialConcurrencyShowCustomDivision = false;
      $rootScope.trialConcurrencyMessageCustomDivision = '';
      $rootScope.showAmPortalButton = false;
      $rootScope.trialConcurrencyAmPortalUrl = '';

      $scope.refreshOrderResponse = function (response, sendRefreshMessageToSBL, resetTaxId) {
        sendRefreshMessageToSBL = sendRefreshMessageToSBL || true;
        resetTaxId = resetTaxId || false;
        // send message to SBL
        if ($scope.isInlineCheckout && sendRefreshMessageToSBL && sblMessageCount < sblMessageMaxCount) {
          sblMessageCount = sblMessageCount + 1;
          $scope.callParent({
            'action': 'updatesession'
          });
        }

        $scope.taxExemptMessage = [];
        $scope.messages = response.messages;
        if ($scope.lastPaymentAttemptStatus && $scope.lastPaymentAttemptStatus === IN_PROGRESS) {
          $scope.addAlert('OrderPaymentInProgress');
        }
        $scope.hasRecurring = response.hasRecurring;
        $scope.hasManagedSubscription = response.hasManagedSubscription;
        $scope.forceFuture = response.forceFuture;

        //We need to save invoiceUrl into the root scope because some responses/refreshes don't necessarily have invoiceUrl
        // defined, so we persist across the checkout process
        if ($rootScope.invoiceUrl == undefined || $rootScope.invoiceUrl == null) {
          if (response.order.invoiceUrl !== undefined || response.order.invoiceUrl !== null) {
            $rootScope.invoiceUrl = response.order.invoiceUrl;
          }
        }

        $scope.invoiceUrl = $rootScope.invoiceUrl;

        if (response.hasOwnProperty('orderLevelDiscountEnabled')){ 
          $scope.orderLevelDiscountEnabled = response.orderLevelDiscountEnabled;
        }

        $scope.orderLevelCouponApplied = response.order.orderLevelCouponApplied;

        if (response.order.coupons.length > 0) {
          $scope.hasValidCoupon = true;
          $timeout(() => {
            document.getElementById('coupon-applied-message').textContent=document.getElementById('coupon-btn').textContent;
          }, 500);
        } else {
          $scope.hasValidCoupon = false;
        }

        $scope.groups = response.order.groups;
        $scope.containsPhysicalProduct = response.order.includesPhysicalGoods;
        $scope.total = response.order.total;
        $scope.totalWithTax = response.order.totalWithTax;
        $scope.totalValue = response.order.totalValue;
        $scope.totalSavings = response.order.discountTotal;
        $scope.totalSavingsVal = response.order.discountTotalValue;
        $scope.productLevelDiscountTotal = response.order.productLevelDiscountTotal;
        $scope.productLevelDiscountTotalValue = response.order.productLevelDiscountTotalValue;
        $scope.orderLevelDiscountTotal = response.order.orderLevelDiscountTotal;
        $scope.orderLevelDiscountTotalValue = response.order.orderLevelDiscountTotalValue;
        console.log('Product Level Savings: ' + $scope.productLevelDiscountTotalValue + ', Order Level coupon Value: ' + $scope.orderLevelDiscountTotalValue);
        $scope.originalTotal = response.order.originalTotal;
        $scope.originalTotalValue = response.order.originalTotalValue;
        $scope.shippingCost = response.order.shippingCost;
        $scope.shippingCostValue = response.order.shippingCostValue;

        $scope.tax = response.order.tax;
        $scope.taxExempt = response.order.taxExempt;
        $scope.taxExemptionIdApplied = response.order.taxExemptionIdApplied;
        $scope.taxExemptionAllowed = response.order.taxExemptionAllowed;

        if (resetTaxId){
          $scope.taxId = response.order.taxExemptionId === undefined ? '': response.order.taxExemptionId;
        }

        $scope.storeTaxPriceMode = response.order.storeTaxPriceMode;
        $scope.taxRate = response.order.taxRate;
        $scope.taxValue = response.order.taxValue;
        $scope.taxType = response.order.taxType;

        // TNP-28036 if there is an applied order level or a product level discount, the subtotal will be the list total, 
        // which is the sum of all the list prices of the items in the shopping cart before any discounts have been applied.
        $scope.subtotal =  $scope.orderLevelCouponApplied || $scope.productLevelDiscountTotalValue > 0 ? response.order.listTotal : response.order.subtotal;

        if($scope.savedPaymentMethod && $scope.variables.enableOneClickPayment){
          $scope.compareDates($scope.savedPaymentMethod.cardExpirationYear, $scope.savedPaymentMethod.cardExpirationMonth);
          if($scope.showExpirationMessage){
            $scope.savedCreditCardName = response.order.savedPaymentMethod.name;
            $scope.savedPaymentMethod = null;
          }
        }
        $scope.savedPaymentMethod = $scope.savedPaymentMethod === null ? null : response.order.savedPaymentMethod;
        $scope.pixEligibleForExpressPayment = $scope.pixEligibleForExpressPayment === null ? null : response.order.pixEligibleForExpressPayment;

        $scope.coupons = response.order.coupons;
        $scope.allCrossSells = response.order.allCrossSells;
        $scope.crossSellFirstConfigTitle = response.order.firstCrossSellConfigurationDisplay == undefined && response.order.firstCrossSellConfigurationDisplay != "" ? $filter('phrase')('YouMayAlsoLike') + "..." : response.order.firstCrossSellConfigurationDisplay;
        $scope.upsellFirstConfigTitle = response.order.firstUpsellConfigurationDisplay == undefined || response.order.firstUpsellConfigurationDisplay == "" ? $filter('phrase')('UpgradeTo') + "..." : response.order.firstUpsellConfigurationDisplay;

        $scope.originalTotalWithoutTaxes = '$' +( this.originalTotalValue - this.taxValue).toFixed(2);

        $scope.paymentOptionList = [];
        $scope.paymentOptions = [];
        $scope.reloadPaymentOptionListIfSepaExist = false;
        paymentOptionsSupportRecurring = [];
        paymentOptionsNonRecurring = [];

        $scope.trialConcurrencyShowCustomDivision = false;
        $scope.trialConcurrencyMessageCustomDivision = '';

        $scope.taxExemptDialog = false;

        if (response.paymentOptions.length > 0) {
          $scope.paymentOptions = response.paymentOptions;
          $scope.paymentOptionVariables = response.paymentOptionVariables;
          freePaymentMethod = $scope.paymentOptions[0] && $scope.paymentOptions[0].type === 'free' && $scope.paymentOptions[0];

          // Set pixAllowRecurring from payment options
          var pixOption = response.paymentOptions.find(function(option) {
            return option.type === 'pix';
          });
          $scope.pixAllowRecurring = pixOption ? pixOption.supportRecurring : false;

          if (($scope.hasRecurring && (response.paymentOptions.length !== 1 || response.paymentOptions[0].type !== 'free')) || ($scope.hasPerpetualProduct(createItemsArray(response.order.groups)) && !$scope.savedPaymentMethod && $scope.variables.enableOneClickPayment)) {
            $scope.subscriptionCheckbox.display = !$scope.forceFuture && initData.autoRenewToggle && ($scope.option !== undefined && $scope.variables.subscriptionAutoRenew != "auto" ? $scope.option.supportRecurring : true);
          } else {
            $scope.subscriptionCheckbox.display = false;
          }
          /**
           * [if paymentOptions in server response]
           * Set default $scope.payment.optionType, handle free option case
           * Needed for choosePaymentOption and choosePaymentOptionWithField functions
           */
          if (!$scope.payment || ($scope.paymentOptions[0] && $scope.paymentOptions[0].type === 'free')) {
            $scope.payment = {};
            if ($scope.paymentOptions[0].type === 'free') {
              $scope.payment.optionType = 'free';
            } else {
              if ($scope.containsPhysicalProduct || $scope.variables.forcePhysicalAddressCollection == "true") {
            	  $scope.payment.redirectedMethods = ["paypal","amazon","pix"];
              } else {
            	  $scope.payment.redirectedMethods = ["paypal","amazon","pix","wire"];
              }

              // Removing PayPal from this list means enable shipping address collection at the checkout screen
              if($scope.hasSiteLevelFeatureFlag("paypal.address.collection.at.checkout")) {
                const index = $scope.payment.redirectedMethods.indexOf("paypal");
                if (index > -1) {
                  $scope.payment.redirectedMethods.splice(index, 1);
                }
              }
              
              if (response.order.savedPaymentMethod) {
                //Save the input payment method and preselect it ONLY if 1ClickPay is not visible.
                $scope.inputPaymentMethod = response.paymentMethod;
              }

              //from sbl payload for checkout using payment method
              //Avoid preselecting the sbl input payment method immediately if 1ClickPay is available to prevent 1ClickPay from being displayed with ach fields for example.
              if(response.paymentMethod && !response.order.savedPaymentMethod){
                //default preSelectedMethod controls the display of forceAddressCollection
                $scope.payment.optionType = response.paymentMethod;
                $scope.payment.optionTypeBySBL = true; // Payment method pre-selected form SBL payload.
              } else {
                $scope.payment.optionType = "card"; //default
              }
            }
          }

          $scope.isInlineCheckout = ($scope.session && $scope.session.secondary && $scope.session.secondary.indexOf('embedded') !== -1);
          $scope.totalPaymentOptions = 0;
          $scope.paymentOptionList = [];
          $scope.listPaymentOptions = [];
          $scope.threeDotsSelectedWithArrowKeys = false;
          $scope.arrowKeyOtherSelectedOption = "";
          $scope.otherPaymentOptions = [];
          $scope.reloadPaymentOptionListIfSepaExist = false;
          paymentOptionsSupportRecurring = [];
          paymentOptionsNonRecurring = [];
          angular.forEach($scope.paymentOptions, function(o) {
            if (o.type === 'applepay') {
              // Setup URLs
              let url = $scope.session.applePayUrl;
              $scope.isBGDarkMode = $scope.isBackgroundDarkMode($scope.variables.bgColor);

              url += "&buttonOnly=true&compliance=" + ((!$scope.complianceData.enabled) || $scope.complianceData.checked || $scope.enableNewTermsAndPolicy);
              if ($scope.isBGDarkMode || $scope.variables.imageMode === 'dark') {
                url += "&darkMode=true";
              }
              if ($scope.variables.themeLayout === 'stacked') {
                url += "&express=true";
              }
              if ($scope.variables.borderRadiusButton) {
                url += "&buttonRadius=" + $scope.variables.borderRadiusButton.replace(/\D+\./g, '');
              }
              $scope.applePayEmbeddedUrl = $sce.trustAsResourceUrl(url);

              if ($scope.isInlineCheckout && window.PaymentRequest && window.PaymentRequest != null && (isSafari || isiOSMobile) && $scope.variables.themeLayout === 'stacked') {
                if ($scope.expressCheckoutButtons.indexOf('applepay') === -1 && !$scope.applePayDisabled) {
                  $scope.expressCheckoutButtons.push('applepay');
                }
                o.visible = false;
                $scope.enableEmbeddedApplePay = o.enableEmbeddedPopup ? true : false;
                $scope.enableEmbeddedNativeApplePay = o.enableEmbeddedNative ? true : false;
              } else {
                o.visible = (window.PaymentRequest && window.PaymentRequest != null && (isSafari || isiOSMobile));

                if (!o.visible && o.enableQRCodeLink) { // Show device link, on unsupported browsers
                  o.visible = true;
                  $scope.enableApplePayDeviceLink = true;
                  $scope.buildApplePayDeviceLink();
                }
              }
            }

            if ($scope.variables.themeLayout === 'stacked' && o.type === 'googlepay' && o.visible) {
              if ($scope.expressCheckoutButtons.indexOf('googlepay') === -1) {
                $scope.expressCheckoutButtons.push('googlepay');
              }
              o.visible = false;
            }

            if (o.type === 'card' && $scope.savedPaymentMethod && $scope.isInlineCheckout && $scope.variables.themeLayout === 'stacked'){
              if ($scope.expressCheckoutButtons.indexOf('card') === -1) {
                $scope.expressCheckoutButtons.push('card');
              }
              $scope.savedExpressPaymentMethod = $scope.savedPaymentMethod;
              $scope.savedPaymentMethod = null;
            }

            if (o.type === PIX_PAYMENT_METHOD && $scope.pixEligibleForExpressPayment && $scope.isInlineCheckout && $scope.variables.themeLayout === 'stacked'){
              if ($scope.expressCheckoutButtons.indexOf(PIX_PAYMENT_METHOD) === -1) {
                $scope.expressCheckoutButtons.push(PIX_PAYMENT_METHOD);
              }
              o.visible = false;
            }

            if (o.visible) {
              if (o.supportRecurring) {
                paymentOptionsSupportRecurring.push(o);
              }
              paymentOptionsNonRecurring.push(o);
            }
            if (o.type == $scope.payment.optionType) {
              $scope.option = o;
            }

          });
        }

        $scope.showLastExpressPaymentMethodUsed = false;
        let lastExpressPaymentMethodResponse = response.lastExpressPaymentMethodUsed;
        
        if (lastExpressPaymentMethodResponse && $scope.lastExpressPaymentMethodUsed !== SHOW_OTHER_PAYMENT_METHODS && $scope.expressCheckoutButtons.indexOf(lastExpressPaymentMethodResponse) >= 0) {
          $scope.lastExpressPaymentMethodUsed = lastExpressPaymentMethodResponse;
          $scope.showLastExpressPaymentMethodUsed = true;
        }

        $scope.isInvoicePayment = function() {
          if ($scope.invoiceUrl == undefined) {
            return false;
          } else if ($scope.invoiceUrl != null) {
            return true;
          }
          return false;
        }

        $scope.setPaymentOptions();

        //If a payment method from the "More payment options" dropdown was previously moved to the list of visible ones, keep it there after resetting the list of payment methods
        if ($scope.otherPaymentOptionSelected) {
          displayOtherSelectedPaymentMethod($scope.otherPaymentOptionSelected);
        }

        $scope.stopRotateCards();
        $scope.rotateCards();

        if ($scope.variables.enableGiftPurchases === 'true' || $scope.variables.allowSeparateBillingContactInfo === 'true') {
          if (response.recipients) { // Always return if enabled
            if (!$scope.recipient) {
              // Initialize recipient
              $scope.recipient = response.recipients[0] || {}; // if recipient is enabled,
              if (!$scope.recipient.address) {
                $scope.recipient.address = {};
              }
              if ($scope.recipient.selected) {
                $scope.determineTax();
              }
              if (!$scope.recipient.memo) {
                $scope.recipient.memo = "";
              }
            }
            if (response.recipients[0]) {
              $scope.recipient.requirements = response.recipients[0].requirements;
              $scope.recipient.requirements.requireNone = !$scope.recipient.requirements.requireContact && !$scope.recipient.requirements.requireAddress && !$scope.recipient.requirements.requirePostal && !$scope.recipient.requirements.requirePhone;
            }
            $scope.recipient.requirements.requireShipping = $scope.paymentOptions[0] && $scope.paymentOptions[0].requireShipping; // This determines billing vs shipping title
          }
        }

        $scope.exposeSubscriptionTerms = function (){
          if($scope.variables.subscriptionTermsExpose == 'visible') {
            return true;
          }else {
            return false;
          }
        }

        $scope.shouldShowTax = function () {
          const subscriptions = $scope.itemsArray?.orderSubscriptions;
          const hasSubscriptions = Array.isArray(subscriptions) && subscriptions.length > 0;

          let isTrial = false;
          if (hasSubscriptions) {
            const sub = subscriptions[0].subscription;
            isTrial = sub?.instructions?.[0]?.type === 'trial';
          }

          return !isTrial;
        };

        $scope.showDetails = function () {
           $scope.getRenewalInvoiceDetails();
          return !$scope.exposeSubscriptionTerms() && !$scope.isRenewalInvoice();
        };

        $scope.displayGiftPurchases = $scope.variables.enableGiftPurchases === 'true' && $scope.recipient;
        $scope.displaySeparateBillingInfo = $scope.variables.allowSeparateBillingContactInfo === 'true' && $scope.recipient;

        //Now recursively iterate other levels
        var elem = $scope.groups;
        var x = 1;
        $scope.inOrder = [];
        // the reason we are restricting cart items through the front end is because the backend add's shipping calculation as an item in a group. We do not want to display shipping calculation as an item but as its own text.
        // we are restricting shipping calculation cost from the subtotal since we do not want to include shipping cost. The shipping total is already included in totalWithTax because it is treated as an item. We just need to hide display on cart.
        var restrictedCartItems = ["SystemExtension.shippingcalculation"];

        $scope.collectSelectedItems = function(elem) {
          var currentGroup = 0;
          elem.forEach(function(group) {
            angular.forEach(group.items, function(item, key) {
              // it's checkout, we only need selected //

              if (item.selected === true) {
                //reset item object

                // populate with data for this item

                if (item.future && item.future.intervalUnit == "adhoc") {
                  $rootScope.containsAdhoc = true;
                }
                if (item.future) {
                  $rootScope.containsSub = true;
                }

                if(restrictedCartItems.indexOf(item.path) < 0 && (!$scope.isSupportedProductOptionType(group.type) || currentGroup != 0)) {
                  if(currentGroup != 0 && group.type != 'add'){
                    item.groups = [];
                  }
                  $scope.inOrder.push(item);
                }
              }
              if (!!item.groups && item.groups.length > 0 && !item.bundle) {
                $scope.collectSelectedItems(item.groups);
              } else {
                return;
              }
              // create inOrder array with selected item names
            });
            currentGroup++;
          });
        };

        $scope.isSupportedProductOptionType = function(groupType){
          return groupType == 'config-many' || groupType == 'addon-many';
        };

        $scope.collectSelectedItems(elem);
        $scope.createList();

        /*==========  Coupons input refresh  ==========*/
        $scope.$watch('couponString', function(newVal, oldVal) {
          if (typeof newVal === "string" && newVal.length > 0) {
            $scope.showCouponInput = true;
          }
        });

        // Expose coupon field
        $scope.showCouponInput = ($scope.variables.couponFieldExpanded == 'true');

        $scope.couponString = '';

        response.order.coupons.forEach(function(c) {
          $scope.couponString += c + ' ';
        });

        $scope.couponString = $scope.couponString.trim();

        $scope.itemsArray = createItemsArray(response.order.groups); // {orderITems, orderSubscriptionsAdhoc}

        $scope.showAddressField = $scope.option && $scope.option.requireShipping || $scope.variables.forcePhysicalAddressCollection !== 'false';

        // rebuild options array
        //$scope.createOptionsArray();
        updatePostalPhrase();
        $scope.sendResizeMessage();
        $scope.showSubscriptionCheckboxForProducts();

      };

      $scope.unSelectSavedPaymentMethod = function() {
        // Preselect the sbl input payment method in case there's one
        if ($scope.inputPaymentMethod) {
          let preselectedOption = $scope.paymentOptionList.find(option => option.type === $scope.inputPaymentMethod);
          if (preselectedOption) {
            $scope.payment.optionType = $scope.inputPaymentMethod;
            $scope.payment.optionTypeBySBL = true;
            $scope.option = preselectedOption;
            
            $scope.sortPreSelectedPaymentOptions();
            $scope.checkMaxPaymentOptions($scope.paymentOptionList);
          }
        }
        
        $scope.savedPaymentMethod = null;
        $scope.zipCodeValid = false;
        if($scope.hasPerpetualProduct($scope.itemsArray) && $scope.payment.optionType == "card"){
          $scope.subscriptionCheckbox.display = true;
        }
        if($scope.hasRecurring && $scope.variables.subscriptionAutoRenew.includes('auto')){
          $scope.subscriptionCheckbox.autoRenew = true;
        }
      }

      $scope.formatTotalLabel = function(originalAmount, currentAmount) {
        if ($scope.totalSavingsVal > 0) {
          return $filter('phrase')('OriginalPrice') + ': ' + originalAmount + '. ' + $filter('phrase')('CurrentPrice') + ': ' + currentAmount;
        } else {
          return $filter('phrase')('Total') + ': ' + originalAmount;
        }
      };

      $scope.getTotalAriaLabel = function() {
        // 1) Free case
        if ($scope.priceFree($scope.total) && ((!$scope.isOnlyTrialNoOblProd() && $scope.itemsArray.orderSubscriptions.length > 1) || !$scope.isOnlyFreeTrialItems() || $scope.isOnlyTrialWithOblProd())) {
          return $filter('phrase')('TotalTextFree');
        }

        // Non‐US, not free
        // or US with charge & not tax‐exempt
        // or US with charge, tax‐exempt, taxValue == "0.00"
        if ((!$scope.priceFree($scope.total) && $scope.country !== 'US') || ($scope.applyUsCharge($scope.total) && !$scope.taxExempt) || ($scope.applyUsCharge($scope.total) && $scope.taxExempt && $scope.taxValue === '0.00')) {
          return $scope.formatTotalLabel($scope.originalTotal, $scope.totalWithTax);
        }

        if ($scope.applyUsCharge($scope.total) && $scope.taxExempt && parseFloat($scope.taxValue) > 0) {
          return $scope.formatTotalLabel($scope.originalTotalWithoutTaxes, $scope.total);
        }

        return $filter('phrase')('Total') + ': ' + $scope.originalTotal;
      };

      $scope.getTotalDisplay = function() {
        var info = {
          isFree: false,
          label: '',
          original: '',
          final: '',
          isOldPrice: false,
          showFinal: false
        };

        var total = $scope.total;
        var totalSavingsVal = $scope.totalSavingsVal;
        var taxExempt = $scope.taxExempt;
        var taxValue = parseFloat($scope.taxValue || '0.00') || 0;

        // Free trial logic
        if (!$scope.isOnlyTrialNoOblProd() && $scope.priceFree(total) && ((!$scope.isOnlyTrialWithOblProd() && $scope.itemsArray.orderSubscriptions.length > 1) || !$scope.isOnlyFreeTrialItems() || $scope.isOnlyTrialWithOblProd())) {
          info.isFree = true;
          info.label = $filter('phrase')('TotalTextFree');
          return info;
        }

        // Regular price
        info.isFree = false;
        info.label = $filter('phrase')('Total');
        info.isOldPrice = (totalSavingsVal > 0);
        info.showFinal = (totalSavingsVal > 0);

        // If we are charging U.S. tax AND they are tax‐exempt with taxValue > 0,
        // we must show originalTotalWithoutTaxes + total
        if ($scope.applyUsCharge(total) && taxExempt && taxValue > 0) {
          info.original = $scope.originalTotalWithoutTaxes;
          info.final = $scope.total;
        } else {
          info.original = $scope.originalTotal;
          info.final = $scope.totalWithTax;
        }

        return info;
      };


      $scope.findHookContainer = function(hookEvents) {

        // find "origin" events and send events to the origin

        angular.forEach(hookEvents, function(hookEvent) {

          if (hookEvent.hasOwnProperty('hook') && hookEvent.id == 'origin') {

            $scope.callParent({
              'action': 'hook',
              'hookData': hookEvent.data
            });

          }

          if (hookEvent.id == 'origin' && hookEvent.hasOwnProperty('type') && hookEvent.type == "browser.order.completed") {
            $scope.orderId = hookEvent.data.id;
          }

        });
      };

      function shouldResize() {
        return $scope.isInlineCheckout && !$scope.showEmptyCartPage;
      }

      function getBannerOffset() {
        if ($scope.referer) {
          var banner = document.querySelector('.whitelist-banner');
          if (banner) return 40; // fixed offset
        }
        return 0;
      }

      function computeAndPostHeight(container, extra = 0) {
        try { $scope.$apply(); } catch (_) { /* NOOP */ }

        var base = container ? container.clientHeight : 0;
        var height = base + getBannerOffset() + (extra || 0);
        var upiQRWidget = document.querySelector('.upi-widget-modal .modal-dialog');
        if (upiQRWidget && container) {
          var qrWidthAdditionalHeight = upiQRWidget.clientHeight - container.clientHeight;
          if (qrWidthAdditionalHeight > 0) {
            height += qrWidthAdditionalHeight;
          }
        }
        $scope.realContainerHeight = height;

        if (height > 0 && $scope.callParent) {
          $scope.callParent({
            action: 'resizeInlineContainer',
            height: height
          });
        }
      }

      $scope.sendResizeMessage = function () {
        return $scope.isAccordionView
          ? $scope.sendResizeMessageAccordion()
          : $scope.sendResizeMessageInline();
      };

      $scope.sendResizeMessageInline = function () {
        if (!shouldResize()) return;

        $timeout(function () {
          var container = document.querySelector('.inline-checkout-modal .modal-dialog');
          if (!container) return;

          $scope.afterPaint(function () {
            computeAndPostHeight(container, 0);
          });
        }, 0, /*invokeApply*/ false);
      };

      $scope.sendResizeMessageAccordion = function () {
        if (!shouldResize()) return;

        $timeout(function () {
          var container = document.querySelector('#app');
          if (!container) return;

          var extra = $scope.isAccordionView ? 65 : 0;

          // Initial measure
          $scope.afterPaint(function () {
            computeAndPostHeight(container, extra);
          });

          // Keep height accurate on late layout changes
          const ro = new ResizeObserver(function () {
            $scope.afterPaint(function () {
              computeAndPostHeight(container, extra);
            });
          });
          ro.observe(container);
          $scope._appResizeObserver = ro;
        }, 0, /*invokeApply*/ false);
      };

      // Cleanup observer on scope destroy
      $scope.$on('$destroy', function () {
        try { $scope._appResizeObserver && $scope._appResizeObserver.disconnect(); } catch (_) {}
      });

      $scope.publishAnalyticsEvent = function(eventData) {
        $scope.callParent({
          'action': 'event',
          'eventData': eventData
        });
      };

      $scope.localAnalyze = function(e) {
        analyze(e);
        $scope.publishAnalyticsEvent(e);
      };

      //this method adjusts URL to communicate language and style
      $scope.renderCaptchaWidget = function() {
        debug("renderCaptchaWidget", $scope.session);
        if (! $scope.session.captchaRequired) {
          return;
        }
        var captchaTheme = 'light';
        if( $scope.useDarkModeForExternalWidgets ) {
           captchaTheme = 'dark';
        }
        var hideCaptchaWidget = 'card' !== $scope.payment.optionType ;

        var captchaLang = $scope.language;
            //https://developers.cloudflare.com/turnstile/reference/supported-languages/
            var turnstileSupportedLanguageCodes = new Set([
              "ar", "bg", "zh", "hr", "cs", "da", "nl", "en", "fa", "fi", "fr", "de",
              "el", "he", "hi", "hu", "id", "it", "ja", "ko", "lt", "ms", "nb", "pl",
              "pt", "ro", "ru", "sr", "sk", "sl", "es", "sv", "tl", "th", "tr", "uk", "vi"
            ]);

            if(! turnstileSupportedLanguageCodes.has($scope.language) ) {
              captchaLang = 'en';
            }
        var turnstileParams = {
              sitekey: $scope.variables.captchaWidgetId,
              callback: turnstileCallback,
             "error-callback": turnstileErrorCallback,
              size: "flexible",
              language: captchaLang,
              theme: captchaTheme,
        };

          //without timeout it does not get rendered on popup
          setTimeout(() => {
              try {
                  var captchaElement = document.getElementById('captcha');
                  debug("renderCaptcha explicitly", captchaElement, "hide", hideCaptchaWidget, captchaTheme, $scope.language, $scope.variables.captchaWidgetId);
                  if (captchaElement) { //dom might not have it yet when app starts
                      captchaElement.innerHTML = '';
                      if (hideCaptchaWidget) {
                          return;
                      }
                      turnstile.render("#captcha", turnstileParams);
          }
        }catch(err) {
          console.error("renderCaptcha error", err);
        }
          }, 200);




      }

      $scope.findSelectedItems = function(item) {
        if (item.selected == true) {
          $scope.inOrder.push(item);
        }
      };

      $scope.createList = function() {
        $scope.itemsList = '';
        var length = $scope.inOrder.length
        for (var i = 0; i < length; i++) {
          $scope.itemsList = $scope.itemsList || '';
          $scope.itemsList += $scope.inOrder[i].display;
          if (i + 1 < length) {
            $scope.itemsList += ', ';
          }
        };
      };

      $scope.hasSiteLevelFeatureFlag = function(featureFlag) {
        if (typeof $scope.siteLevelFeatureFlags !== 'undefined' && $scope.siteLevelFeatureFlags.hasOwnProperty(featureFlag)) {
          return $scope.siteLevelFeatureFlags[featureFlag] === "true";
        }
        return false;
      };

      // Checks whether Addition is product level or storefront level
      $scope.isStorefrontLevel = function(offer) {
        try {
          if (!(offer.type == 'add') || !(offer.driver.length > 0)) {
            return;
          } else {
            if (typeof($scope.session.secondary) == 'undefined') {
              if (offer.driver == $scope.session.primary) {
                return true;
              }
            } else if ($scope.session.secondary.length > 0) {
              if (offer.driver == $scope.session.primary + '-' + $scope.session.secondary) {
                return true;
              }
            } else {
              return false;
            }
          }
        } catch (e) {
          debug('Pinhole', e);
        }
      };

      $scope.hasQuantityChanges = function(item) {
        return item.stagedQuantity != item.quantity;
      };

      $scope.useQuantityInput = function(item) {
        return item.useQuantityInput == true || item.quantity >= item.maxQuantityForInput;
      };

      $scope.changeQuantity = function(item, force) {
        if (force != null && !force) {
          if (!$scope.hasQuantityChanges(item)) return;

          if (item.stagedQuantity == item.maxQuantityForInput) {
            item.useQuantityInput = true;
            return; /* Now must use the 'Update' link */
          }
        }

        var data = {
          quantity: item.stagedQuantity
        };

        if (item.stagedQuantity === 0) {

          $scope.itemObj = {};

          $scope.itemObj.name = String(item.display);
          $scope.itemObj.id = String(item.path);
          $scope.itemObj.price = String(item.unitPriceValue);
          $scope.itemObj.quantity = String(item.stagedQuantity);
        }

        $scope.http('PUT', '/items/' + item.path, data,
          function(result) {
            $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
            $scope.refreshOrderResponse(result, true, false);
            $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
            //the sepa payment option is enabled or disabled based on total, based on this, the payments options are reloaded again
            if (result.order.groups.length > 0 ) {
              $scope.itemsToEvaluate = result.order.groups[0].items;
            }
            if($scope.reloadPaymentOptionListIfSepaExist) {
              $scope.localeChange($scope.country);
            }
          },
          function(result) {
            item.stagedQuantity = item.quantity; // Reset after failure.
          }
        );
      };

      $scope.getAddressTemplate = function() {
        if ($scope.country == 'US' || $scope.country == 'JP' || $scope.country == 'CA' || $scope.country == 'DE' || $scope.country == 'AU') {
          return "address_" + $scope.country + ".html";
        } else if ($scope.country == 'AT' || $scope.country == 'CH') {
          return "address_DE.html";
        } else {
          return "address_OTHER.html";
        }
      };

      $scope.getUsStatesTemplate = function() {
          return "address_US_states.html";
      };

      $scope.countryIcon = function(country) {
        if (!angular.isDefined(country)) {
          country = $scope.country;
        }
        var flagIcon = imageCDN + 'countries/v2/' + country + '.png';
        return flagIcon;
      };

      $scope.brandTitle = function(title) {
          if ($scope.variables.hasOwnProperty('whichLogoTitle') && $scope.variables.whichLogoTitle == 'store') {
            return $scope.variables.title || '';
          } else if ($scope.variables.hasOwnProperty('whichLogoTitle') && $scope.variables.whichLogoTitle == 'logo') {
            return '';
          } else {
            return $scope.getFirstProductDisplayNameInCart();
          }
        }
        //Function brandImageStyle handles option Which icon and title to show ( Storefront or Product)
      $scope.brandImageStyle = function(item) {
        if ($scope.variables.hasOwnProperty('whichLogoTitle') && ($scope.variables.whichLogoTitle == 'store' || $scope.variables.whichLogoTitle == 'logoproduct' || $scope.variables.whichLogoTitle == 'logo')) {
          //run ImageStyle with Logo or LogoRetina parameter
          if ($scope.variables.logoRetina) {
            return {
              'background-image': 'url(' + $scope.variables.logoRetina + ')'
            };
          } else if ($scope.variables.logo) {
            return {
              'background-image': 'url(' + $scope.variables.logo + ')'
            };
          }
        } else {
          return $scope.imageStyle(item);
        }
      };

      $scope.getLogoClass = function(item) {
        if ($scope.variables.whichLogoTitle == 'product' && !item.image)
            return;

        if (($scope.variables.logoRetina || $scope.variables.logo || ($scope.variables.whichLogoTitle == 'product' && item.image) || $scope.variables.whichLogoTitle == 'logoproduct'))
          return $scope.variables.placeLogo;
      };

      $scope.isIE = function() {
        var myNav = navigator.userAgent.toLowerCase();
        var trident = myNav.indexOf('trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = myNav.indexOf('rv:');
            return parseInt(myNav.substring(rv + 3, myNav.indexOf('.', rv)), 10) == 11;
        } else {
          //IE 11 and lower
            return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1], 10) : false;
        }
      }

      $scope.crossSellsBlockIE = function() {
        if($scope.isIE()) {
          return document.getElementById('mg-lg-crossSell-display').offsetHeight + 'px';
        }
      }

      $scope.imageStyle = function(item) {
        if (!item || !item.image || !item.image.length) {
          return {};
        }
        return {
          'background-image': 'url(' + item.image + ')'
        };
      };

      function getRegions(country) {
        var deferred = $q.defer();
        $http({
          method: 'GET',
          url: initData.services['address.service.endpoint'] + '/countries/' + country + '/regions'
        }).then(function(response) {
          return deferred.resolve(response.data);
        }, function(response) {
          return deferred.reject(response.data);
        });
        return deferred.promise;
      }

      function isRegionInList(country, contact) {
        if (contact && contact.region && $scope.regionList[country]) {
          angular.forEach($scope.regionList[country], function(state) {
            if (state.abbreviation === contact.region.toUpperCase() || state.name.toUpperCase() === contact.region.toUpperCase() || state.code === contact.region) {
              contact.region = state.abbreviation;
              return false;
            }
          });
        }
      }

      $scope.regionList = {};

      /**
       * POST call to stores /locale endpoint to update localization
       * @param country
       * @param language - optional
       * @param currencyOverride - optional if you want to keep same locale but change the currency of the checkout
       */
      $scope.localeChange = function(country, countryDisplay, language, languageDisplay, currencyOverride) {

        var previousCountry = $scope.countryDisplay;
        var previousLanguage = $scope.languageDisplay;

        var data = {
          country: country,
          language: language,
          currencyOverride: currencyOverride,
          total: $scope.totalValue
        };

        var resetTaxId = false;

        if (country !== undefined && country !== null && country != $scope.country) {
          $scope.localAnalyze({
            'event': 'FSC-countryChange',
            'fsc-url': window.location.href,
            'fsc-referrer': document.referrer,
            'fsc-currency': String($scope.order.currency),
            'fsc-eventCategory': 'Interaction',
            'fsc-eventAction': 'Country Change',
            'fsc-eventLabel': $scope.country + ' -> ' + country,
            'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
          });
          resetTaxId = true;
        }

        if (language !== undefined && language !== null && language != $scope.language) {

          $scope.localAnalyze({
            'event': 'FSC-languageChange',
            'fsc-url': window.location.href,
            'fsc-referrer': document.referrer,
            'fsc-currency': String($scope.order.currency),
            'fsc-eventCategory': 'Interaction',
            'fsc-eventAction': 'Language Change',
            'fsc-eventLabel': $scope.language + ' -> ' + language,
            'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
          });
          resetTaxId = false;
        }

        $scope.http('POST', '/locale', data, function(result) {
          $scope.refreshPageResponse(result, true, resetTaxId);
          $scope.regions = [];
          setCountriesList($scope.country, $scope.language, $scope.regions);

          try {
            // translation doesn't render in some special cases, $apply didn't help, seems issue with angular framework, force appying
            if ($scope.showCardExpireMonthYearInvalidMessage) {
              const errorMessageInvalidDiv = document.getElementById('month-year-error-message-invalid');
              if (errorMessageInvalidDiv) {
                if (result && result.phrases && result.phrases['CardExpireMonthYearInvalid']) {
                  errorMessageInvalidDiv.innerHTML = result.phrases['CardExpireMonthYearInvalid'];
                }
              }
            } else if($scope.showCardExpireMonthYearIncompleteMessage) {
              const errorMessageIncompleteDiv = document.getElementById('month-year-error-message-incomplete');
              if (errorMessageIncompleteDiv) {
                if (result && result.phrases && result.phrases['CardExpireMonthYearIncomplete']) {
                  errorMessageIncompleteDiv.innerHTML = result.phrases['CardExpireMonthYearIncomplete'];
                }
              }
            }
          } catch(e)  {
          }

          if (result.country === 'US' || result.country === 'CA' || result.country === 'AU') {
            if ($scope.regionList[result.country]) {
              isRegionInList($scope.country, $scope.contact);
              if ($scope.recipient) {
                isRegionInList($scope.country, $scope.recipient);
              }
              return;
            }
            getRegions(result.country).then(function(response) {
              $scope.regionList[result.country] = response;
            }, function() {
              $scope.regionList[result.country] = undefined;
            }).finally(function() {
              isRegionInList(result.country, $scope.contact);
              if ($scope.recipient) {
                isRegionInList(result.country, $scope.recipient);
              }
            });
          }
        });
        $scope.announceLocaleChange(countryDisplay, languageDisplay, previousCountry, previousLanguage);
      };

      $scope.offerTypeMap = {
        'replace': {
          'name': 'Up-Sell',
          'positionVariable': 'upSellsPosition'
        },
        'add': {
          'name': 'Cross-Sell',
          'positionVariable': 'crossSellsPositionProduct'
        },
        'options': {
          'name': 'Option',
          'positionVariable': 'option'
        }
      };
      // Analytics
      $scope.analyticsSetOnAccept = function(offerItem, type) {
        var promoObject = {};
        var FSpromoObject = {};
        promoObject = {
          'id': offerItem.path,
          'name': offerItem.display,
          'creative': $scope.offerTypeMap[type].name, //'Up-Sell' or 'Cross-Sell',
          'position': $scope.variables[$scope.offerTypeMap[type].positionVariable] ||
            $scope.offerTypeMap[type].positionVariable //'placement option from settings' (below, above etc)
        }

        FSpromoObject = {
          'id': offerItem.path,
          'name': $scope.offerTypeMap[type].name + ' Offer',
          'creative': $scope.offerTypeMap[type].name, //'Up-Sell' or 'Cross-Sell',
          'position': $scope.variables[$scope.offerTypeMap[type].positionVariable] ||
            $scope.offerTypeMap[type].positionVariable //'placement option from settings' (below, above etc)
        }
      };
      $scope.analyticsSendOnAccept = function(offerItem, type) {
        $scope.itemObj = {};

        $scope.itemObj.name = String(offerItem.display);
        $scope.itemObj.id = String(offerItem.path);
        $scope.itemObj.price = String(offerItem.unitPriceValue);
        $scope.itemObj.quantity = String(offerItem.quantity);
      };

      $scope.onCheckbox = function(item, type, selected) {
        if (selected) {
          $scope.acceptOffer(item, type);
        } else if (selected == false) {
          $scope.deleteItem(item);
        }

      };

      $scope.acceptOffer = function(offerItem, type) {
        try {
          if (type) {
            $scope.analyticsSetOnAccept(offerItem, type);
          }
        } catch (e) {
          debug('Pinhole', e);
        }

        $scope.analyticsSendOnAccept(offerItem, type);

        $scope.http('POST', '/items/' + offerItem.path, {},

          function(result) {
            $scope.refreshOrderResponse(result, true, false);
          });

      };

      $scope.getCartItemTitleSpacing = function(index, item) {
        var itemQuantityWidth;
        if(item && item.pricing){
          if(item.pricing.quantity !== 'hide'){
            itemQuantityWidth = angular.element( document.querySelector( '#cart-item-quantity-wrapper-' + index) )[0];
          }else{
            itemQuantityWidth = angular.element( document.querySelector( '#cart-item-price-' + index) )[0];
          }
        }
        var iconSizeWidth = angular.element( document.querySelector( '#cart-item-icon-wrapper' ) )[0];
        var rowSizeWidth = angular.element( document.querySelector( '#pin-modal' ) )[0];
        if(itemQuantityWidth && iconSizeWidth && rowSizeWidth) {
          itemQuantityWidth = itemQuantityWidth.offsetWidth;
          iconSizeWidth = iconSizeWidth.offsetWidth;
          if(window.matchMedia("(max-width: 375px)").matches) {
            rowSizeWidth = rowSizeWidth.offsetWidth - 48;
          } else {
            rowSizeWidth = rowSizeWidth.offsetWidth - 40;
          }
          if(!item.bundle && !item.subscription && !item.autoRenew) {
            return {width: rowSizeWidth - iconSizeWidth - itemQuantityWidth + "px", top: "6px"};
          }else{
            return {width: rowSizeWidth - iconSizeWidth - itemQuantityWidth + "px"};
          }
        }
      };

      $scope.getCartItemOptionTitleSpacing = function(parentIndex, childIndex, selected, option) {
        var itemQuantityWidth;
        if(option && option.pricing) {
          if(option.pricing.quantity !== 'hide' && selected === 'selected') {
            itemQuantityWidth = angular.element(document.querySelector('#cart-item-option-quantity-wrapper-' + parentIndex + childIndex))[0];
          }else if(option.pricing.quantity !== 'hide' && selected !== 'selected') {
            itemQuantityWidth = angular.element(document.querySelector('#cart-item-option-add-btn-container-' + parentIndex + childIndex))[0];
          } else {
            itemQuantityWidth = angular.element(document.querySelector('#cart-item-option-price-' + parentIndex + childIndex))[0];
          }
        }
        var iconSizeWidth = 45;
        var cartOptionContainer = angular.element(document.querySelector('#cart-item-option-row'))[0];
        if(itemQuantityWidth && iconSizeWidth && cartOptionContainer) {
          itemQuantityWidth = itemQuantityWidth.offsetWidth;
          if(selected != 'selected' && window.matchMedia("(max-width: 375px)").matches){
            cartOptionContainer = cartOptionContainer.offsetWidth - 48;
          } else if(selected != 'selected' && window.matchMedia("(max-width: 770px)").matches){
            cartOptionContainer = cartOptionContainer.offsetWidth - 40;
          } else {
            cartOptionContainer = cartOptionContainer.offsetWidth - 20;
          }
          if(!option.bundle && !option.subscription && !option.autoRenew) {
            return {width: cartOptionContainer - iconSizeWidth - itemQuantityWidth + "px", top: "14px"};
          }else{
            return {width: cartOptionContainer - iconSizeWidth - itemQuantityWidth + "px"};
          }
        }
      };

      $scope.getProductOptionsRowSize = function(input){
        var modalSize = angular.element( document.querySelector( '#pin-modal' ) )[0];
        if(modalSize) {
          modalSize = modalSize.offsetWidth - 30;
          if (input == 'title') {
            return .85 * modalSize - 12 + "px";
          } else if (input == 'title-container') {
            return .85 * modalSize + "px";
          } else {
            return .85 * modalSize + 10 + "px";
          }
        }
      };

      $scope.isNotSubscriptionOrBundle = function(item) {
        return (!item.bundle && !item.subscription && !item.autoRenew);
      }


      $scope.hasPerpetualProduct = function(items){
        for (let i = 0; i < items.orderItems.length; i++) {
          if($scope.isNotSubscriptionOrBundle(items.orderItems[i])){
            return true;
          }
        }
        return false;
      }

      $scope.compareDates = function(expirationYear, expirationMonth){
        let currentDate = new Date();
        let expirationDate = new Date(expirationYear, expirationMonth, 1);
        $scope.showExpirationMessage = currentDate > expirationDate ? true : false;
      }

      $scope.modifyItems = function(quantity, path, $event) {
        $scope.http('PUT', '/items/' + path, {'quantity': quantity},
          function(result) {
            $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
            $scope.refreshOrderResponse(result, true, false);
            $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
            //the sepa payment option is enabled or disabled based on total, based on this, the payments options are reloaded again
            $scope.itemsToEvaluate = result.order.groups[0].items;
            if($scope.reloadPaymentOptionListIfSepaExist) {
              $scope.localeChange($scope.country);
            }
            /* on-blur blocks subsequent click events. Manually firing click events, if click event is blocked by blur */
            if ($event && $event.type === "blur" && $event.target && $event.relatedTarget) {
              if ($event.relatedTarget.id !== "cart-item-quantity" && $event.relatedTarget.id !== $event.target.id) {
                $timeout(function() {
                  $event.relatedTarget.click();
                }, 0);
              }
            }
            // some ui elements validate the cart items based on trials refresh is used to update them
            $scope.updateTrialProductsCount();
          });
      };

      $scope.choosePrivacyPolicyStyle = function(){
        return !$scope.isInlineCheckout ? 'tos-pp-link-popup' : 'tos-pp-link';
      }

      $scope.openPrivacyAndTermsOverlay = function(source) {
        document.getElementById('privacy-and-terms-overlay-info').src = source + '&inappdisplay=true';
        document.getElementById('privacy-and-terms-overlay').style.display = 'block';
      };

      $scope.closePrivacyAndTermsOverlay = function() {
        document.getElementById('privacy-and-terms-overlay').style.display = 'none';
      };

      $scope.addItem = function(item) {
        $scope.http('POST', '/items/' + item.path, {'quantity': item.quantity},
            function(result) {
              $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
              $scope.refreshOrderResponse(result, true, false);
              $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
            });
      };


      $scope.addSiftSnippet = function( userId ) {
          var userIdToSend = ""
          if( userId ) {
            userIdToSend = userId
          }
          if (typeof window._sift === "undefined" && $scope.session.id != "undefined") {
              var _sift = window._sift = window._sift || [];
              _sift.push(['_setAccount', $scope.siftBeaconKey]);
              _sift.push(['_setUserId', userIdToSend]);
              _sift.push(['_setSessionId', $scope.session.id]);
              _sift.push(['_trackPageview']);
              if(  $scope.variables.enableSiftOnFrontend === undefined  || $scope.variables.enableSiftOnFrontend === true) {
                var e = document.createElement('script');
                e.src = 'https://cdn.sift.com/s.js';
                document.body.appendChild(e);
                return true
              }else{
                logMessage("Skipping sift integration");
                return false;
              }
          }
          return false;
      };

      $scope.sendSiftEmail = function(email) {
          if( ! $scope.addSiftSnippet(email) ) {
            //assuming that script is added since we got 'false'
            if ($scope.session.id != null ) {
              var _sift = window._sift;
              _sift.push(['_setAccount', $scope.siftBeaconKey]);
              _sift.push(['_setUserId', email]);
              _sift.push(['_setSessionId', $scope.session.id]);
              _sift.push(['_trackPageview']);
            }
          }
      };


      $scope.placeOrderBtnCaption = function(optionType) {
        if (optionType == 'paypal' || optionType == 'amazon' || optionType == 'free') {
          return $filter('phrase')('PlaceYourOrder');
        } else {
          return $filter('phrase')('EnterPaymentDetails');
        }
      }

      // Use logic to define what messages to show at rebill message
      $scope.rebillMessageSelector = function (item, index=0) {
        if ($scope.isItemPaidTrial(item, index)) {
          return $filter('phrase')('TrialUntil') + item.subscription.instructions[index].periodEndDate;
        } else if ($scope.isItemFreeTrial(item, index)) {
          return $filter('phrase')('FreeTrialUntil') + item.subscription.instructions[index].periodEndDate;
        } else {
          //This is a work-around function
          function buildBilledString(length, unit) {
            if (length == 1) {
              return $filter('phrase')(unit + 'ly');
            }
            if (length > 1) {
              return $filter('phrase')('every') + ' ' + length + ' ' + $filter('phrase')(unit + 's');
            }
          }
          return ''; //$filter('phrase')('billed') + ' ' + buildBilledString(item.subscription.intervalLength, item.subscription.intervalUnit);
        }
      }

      $scope.deleteItem = function(item) {
        item.stagedQuantity = 0;
        $scope.changeQuantity(item);
      };

      $rootScope.contact = {
        email: ''
      };

      // TODO: tmp func
      $scope.getPaymentErrors = function(result) {
        $scope.errorResult = result;
        return result;
      };

      /**
       * [choosePaymentOptionWithFields - Main function in Pinhole which opens products modal dialog ]
       * @param option {[array]}
       */
      $scope.countries = [];
      $scope.languages = [];
      $scope.regions = [];
      $scope.localeDetails = {
        result: {},
        loaded: false
      };
      $scope.selectedRegion = null;

      $scope.chooseRegion = function (region) {
        $scope.selectedRegion = region;
      };

      // Helpers to toggle currency on the fly to approved alt currencies
      $scope.chooseAltCurrency = function (chosenCurrency, hidePopover) {
        //console.log('choosing: ' + chosenCurrency);
        $scope.currencyOptions.override = chosenCurrency;
        $scope.localeChange($scope.country, $scope.language, chosenCurrency);
        if (hidePopover) {
          hidePopover();
        }
      };

      $scope.choose = function (country, countryDisplay, language, languageDisplay, hidePopover) {
        $scope.localeChange(country, countryDisplay, language, languageDisplay);
        if (hidePopover) {
          hidePopover();
        }
      };

      // Kayboard locale modal navigation
      const KEYS = {
        TAB: 'Tab',
        ARROW_LEFT: 'ArrowLeft',
        ARROW_RIGHT: 'ArrowRight',
        ARROW_UP: 'ArrowUp',
        ARROW_DOWN: 'ArrowDown',
        ESCAPE: 'Escape'
      };

      const SELECTORS = {
        COUNTRY_TAB: '#chooseCountry',
        LANGUAGE_TAB: '#chooseLanguage',
        REGIONS: '[id^="region-"]',
        COUNTRIES: '[id^="country-"]',
        LANGUAGES: '[id^="language-"]',
        CLOSE_BUTTON: '#closeLocaleButton'
      };

      const ROLES = {
        TAB: 'tab'
      };

      $scope.closeInlineLocaleModal = function (key) {

        if(key == KEYS.ESCAPE){
          $scope.queueElementClick(document.getElementById('locale-btn-inline-checkout'));
          $scope.focusLocaleButton();
          return true
        }
          return false
      }

      $scope.handleTabAndFocus = function (keyEvent, elementId) {
        if (keyEvent.code !== KEYS.TAB) {
          return;
        }
        keyEvent.preventDefault();
        const elementToFocus = document.getElementById(elementId);
        if (elementToFocus) {
          elementToFocus.focus();
        }
      };

      $scope.handleLocaleTabNavigation = function (event) {
        if (!event) return;

        const isCountryActive = $scope.isTabActive('chooseCountry');
        const isLanguageActive = $scope.isTabActive('chooseLanguage');
        const { key, shiftKey, target } = event;

        if (target.getAttribute('role') !== ROLES.TAB) return;

        // Handle horizontal tab navigation
        if ($scope.isHorizontalArrowKey(key)) {
          event.preventDefault();
          $scope.handleHorizontalNavigation(key, isCountryActive);
        }

        // Handle Shift+Tab from language tab to close button
        if (key === KEYS.TAB && shiftKey && isLanguageActive) {
          event.preventDefault();
          $scope.focusCloseButton();
          return;
        }

        // Handle Tab from country tab to regions
        if (key === KEYS.TAB && !shiftKey) {
          event.preventDefault();

          if ($scope.isInlineCheckout) {
            const handler = isCountryActive
                ? $scope.handleCountryKeyboardNav
                : $scope.handleLanguageKeyboardNav;
            handler(event);
          }

          if (isCountryActive) {
            $scope.executeWithTimeout(() => $scope.focusActiveRegionOrDefault());
          }
        }

        // Handle vertical navigation in regions
        if ($scope.isVerticalArrowKey(key) && isCountryActive) {
          $scope.handleRegionsNavigation(event);
        }

      };

      $scope.handleKeyboardNavInlineLocale = function (keyEvent) {

        let isLocaleModalOpen = document.getElementById('locale-inline-modal')?.style.display !== 'none';

        if(keyEvent.code !==  'Tab' || !isLocaleModalOpen ){
          return
        }

        keyEvent.preventDefault();
        let countryTab = document.getElementById('country-tab');

        if(countryTab){
          countryTab.focus();
        }

      };

      $scope.handleLanguageTab = function (keyEvent) {
        $scope.handleTabAndFocus(keyEvent, 'language-0');
      };

      $scope.handleCountryTab = function (keyEvent) {
        $scope.handleTabAndFocus(keyEvent, 'country-0');
      };

      $scope.handleCountryKeyboardNav = function (keyEvent) {
        $scope.handleTabAndFocus(keyEvent, 'search-input-country');
      };

      $scope.handleLanguageKeyboardNav = function (keyEvent) {
        $scope.handleTabAndFocus(keyEvent, 'search-input-language');
      }

      $scope.handleCountryListNavigation = function (event) {
        if (!event) return;

        const { key, shiftKey, target } = event;
        if (!target.id || !target.id.startsWith('country-')) return;

        const getVisibleCountries = () => {
          const list = document.getElementById('country-list');
          return list ? Array.from(list.querySelectorAll('[id^="country-"]')) : [];
        };

        // ARROWS: move up/down within the visible list
        if ($scope.isVerticalArrowKey(key)) {
          event.preventDefault();

          const countries = getVisibleCountries();
          if (!countries.length) return;

          const currentIndex = countries.indexOf(target);
          if (currentIndex === -1) return;

          let nextIndex = currentIndex;
          if (key === KEYS.ARROW_DOWN) {
            nextIndex = (currentIndex + 1) % countries.length;
          } else if (key === KEYS.ARROW_UP) {
            nextIndex = (currentIndex - 1 + countries.length) % countries.length;
          }

          if (nextIndex !== currentIndex) {
            $scope.executeWithTimeout(() => $scope.focusElement(countries[nextIndex]));
          }
          return;
        }

        // TAB: Shift+Tab from first -> region; Tab from last -> close button
        if (key === KEYS.TAB) {
          const countries = getVisibleCountries();
          if (!countries.length) return;

          const idx     = countries.findIndex(el => el === target);
          const isLast  = idx === countries.length - 1;

          if (shiftKey) {
            event.preventDefault();
            $scope.focusActiveTab();
            return;
          }

          if (!shiftKey && isLast) {
            event.preventDefault();
            $scope.focusElement(countries[0]);
            return;
          }

        }
      };

      $scope.handleModalClose = function (keyEvent) {
        if (keyEvent.key === KEYS.ESCAPE) {
          keyEvent.preventDefault(); // Prevent other actions like clearing the search input
          keyEvent.stopPropagation(); // Stop the event from bubbling further
          $scope.closeInlineLocaleModal('Escape');
        }
      };

      $scope.handleRegionsNavigation = function (event) {
        if (!event) return;

        const { key, shiftKey } = event;

        if ($scope.isVerticalArrowKey(key)) {
          event.preventDefault();
          $scope.navigateRegions(key);
        }

        if (key === KEYS.TAB) {
          event.preventDefault();

          if (shiftKey) {
            $scope.focusCountryTab();
          } else {
            $scope.focusActiveRegionCountry();
          }
        }
      };

      $scope.handleListNavigation = function (event, listType) {
        if (!$scope.isVerticalArrowKey(event.key)) return;

        event.preventDefault();

        const selector = listType === 'country' ? SELECTORS.COUNTRIES : SELECTORS.LANGUAGES;
        const items = Array.from(document.querySelectorAll(selector));
        const currentIndex = $scope.getActiveItemIndex(items);
        const nextIndex = $scope.calculateNextIndex(currentIndex, items.length, event.key);

        $scope.executeWithTimeout(() => {
          const nextItem = document.getElementById(`${listType}-${nextIndex}`);
          if (nextItem) {
            $scope.clickAndFocus(nextItem);
          }
        });
      };

      $scope.handleCloseButtonNavigation = function (event) {
        if (!event) return;

        const { key, shiftKey } = event;

        if (key === KEYS.TAB && !shiftKey) {
          event.preventDefault();
          $scope.focusActiveTab();
        }
      };

      $scope.handleCountryNavigation = function(event) {
        if (!event) return;

        const { key, shiftKey, target } = event;

        if (!target.id || !target.id.startsWith('country-')) return;

        const currentCountryIndex = parseInt(target.id.split('-')[1]);

        if ($scope.isVerticalArrowKey(key) || $scope.isHorizontalArrowKey(key)) {
          event.preventDefault(); // Prevent the browser from scrolling
          $scope.navigateCountryGrid(key);
          return;
        }

        if (key === KEYS.TAB) {
          $scope.handleCountryTabNavigation(event, currentCountryIndex, shiftKey);
          return;
        }
      };

      $scope.handleCountryTabNavigation = function(event, currentIndex, shiftKey) {
        const countryList = document.getElementById('country-list');
        const visibleCountries = countryList ? countryList.querySelectorAll('[id^="country-"]') : [];

        const isLastCountry = currentIndex === visibleCountries.length - 1;

        if (shiftKey) {
          event.preventDefault();
          $scope.focusActiveRegion();
        } else if (!shiftKey && isLastCountry) {
          event.preventDefault();
          $scope.focusCloseButton();
        }
      };

      $scope.handleLanguageNavigation = function(event) {
        if (!event) return;

        const { key, shiftKey, target } = event;

        if (!target.id || !target.id.startsWith('language-')) return;

        const currentLanguageIndex = parseInt(target.id.split('-')[1]);

        if (key === KEYS.TAB) {
          $scope.handleLanguageTabNavigation(event, currentLanguageIndex, shiftKey);
          return;
        }

        const arrowKeys = [
          KEYS.ARROW_UP,
          KEYS.ARROW_DOWN,
          KEYS.ARROW_LEFT,
          KEYS.ARROW_RIGHT
        ];

        if (arrowKeys.includes(key)) {
          event.preventDefault();
          $scope.navigateLanguageGrid(key);
        }

      };

      $scope.handleLanguageTabNavigation = function(event, currentIndex, shiftKey) {
        const totalLanguages = $scope.languages ? $scope.languages.length : 0;
        const isLastLanguage = currentIndex === totalLanguages - 1;

        if (shiftKey) {
          event.preventDefault();
          document.querySelector('#chooseLanguage a').focus();
          return;
        } else if (!shiftKey && isLastLanguage) {
          event.preventDefault();
          $scope.focusCloseButton();
        }
      };

      $scope.isTabActive = function (tabId) {
        return angular.element(document.getElementById(tabId)).hasClass('active');
      };

      $scope.isShiftTabFromFirstCountry = function (event) {
        return event.key === KEYS.TAB &&
            event.shiftKey &&
            event.target.id === 'country-0';
      };

      $scope.isHorizontalArrowKey = function (key) {
        return key === KEYS.ARROW_LEFT || key === KEYS.ARROW_RIGHT;
      };

      $scope.isVerticalArrowKey = function (key) {
        return key === KEYS.ARROW_UP || key === KEYS.ARROW_DOWN;
      };

      $scope.handleHorizontalNavigation = function (key, isCountryActive) {
        if (key === KEYS.ARROW_LEFT) {
          $scope.switchToTab('chooseCountry');
        } else if (key === KEYS.ARROW_RIGHT) {
          $scope.switchToTab('chooseLanguage');
        }
      };

      $scope.navigateRegions = function (key) {
        const regions = $scope.getRegionElements();
        const currentIndex = $scope.getActiveRegionIndex(regions);
        const nextIndex = $scope.calculateNextIndex(currentIndex, regions.length, key);

        $scope.executeWithTimeout(() => {
          const regionElement = document.getElementById(`region-${nextIndex}`);
          if (regionElement) {
            $scope.clickAndFocus(regionElement);
          }
        });
      };

      $scope.navigateCountryGrid = function (key) {
        const container = document.getElementById('country-list');
        if (!container) return;

        const countries = Array.from(container.querySelectorAll('[id^="country-"]'));
        if (countries.length === 0) return;

        const currentIndex = countries.findIndex(c => document.activeElement === c);
        if (currentIndex === -1) return;

        const numColumns = 2; // Based on 'col-sm-6' layout, change
        let nextIndex = -1;

        switch (key) {
          case KEYS.ARROW_UP:
            nextIndex = currentIndex - numColumns;
            break;
          case KEYS.ARROW_DOWN:
            nextIndex = currentIndex + numColumns;
            break;
          case KEYS.ARROW_LEFT:
            // Prevent moving left from the first column
            if (currentIndex % numColumns !== 0) {
              nextIndex = currentIndex - 1;
            }
            break;
          case KEYS.ARROW_RIGHT:
            // Prevent moving right from the last column
            if (currentIndex % numColumns < numColumns - 1) {
              nextIndex = currentIndex + 1;
            }
            break;
        }

        if (nextIndex >= 0 && nextIndex < countries.length) {
          $scope.executeWithTimeout(() => {
            $scope.focusElement(countries[nextIndex]);
          });
        }
      };

      $scope.navigateLanguageGrid = function(key) {
        const buttons = Array.from(document.querySelectorAll('[id^="language-"]'));
        const current = document.activeElement;
        if (!buttons.length || !current || !current.id.startsWith('language-')) return;

        const currRect   = current.getBoundingClientRect();
        const currCenter = $scope.getCenter(currRect);

        const direction = $scope.getDirectionPredicate(key, currCenter);
        if (!direction) return;

        const candidates = buttons
            .map(el => {
              const rect   = el.getBoundingClientRect();
              const center = $scope.getCenter(rect);
              return { el, rect, center };
            })
            .filter(({ rect }) => direction(rect));

        if (!candidates.length) return;

        const best = candidates.reduce((bestSoFar, { el, center }) => {
          const score = $scope.computeScore(currCenter, center, key);
          return score < bestSoFar.score
              ? { el, score }
              : bestSoFar;
        }, { el: null, score: Infinity }).el;

        if (best) {
          if (event && event.preventDefault) event.preventDefault();
          $scope.executeWithTimeout(() => $scope.focusElement(best));
        }
      };

      $scope.switchToTab = function (tabId) {
        $scope.executeWithTimeout(() => {
          const tabElement = $scope.getTabElement(tabId);

          if($scope.isInlineCheckout && tabElement){
            $scope.focusElement(tabElement);
          } else if (tabElement) {
            $scope.clickAndFocus(tabElement);
          }
        });
      };

      $scope.focusElement = function (element) {
        if (element) {
          element.focus();
        }
      };

      $scope.focusLocaleButton = function () {
        $scope.executeWithTimeout(() => {
          const localeButton = document.getElementById('locale-btn-inline-checkout');
          if (localeButton) {
            localeButton.focus();
          }
        });
      };

      $scope.focusCountryTab = function () {
        $scope.executeWithTimeout(() => {
          const countryTab = $scope.getTabElement('chooseCountry');
          if (countryTab) {
            $scope.clickAndFocus(countryTab);
          }
        });
      };

      $scope.focusCloseButton = function () {
        $scope.executeWithTimeout(() => {
          const closeButton = document.querySelector(SELECTORS.CLOSE_BUTTON);
          if (closeButton) {
            closeButton.focus();
          }
        });
      };

      $scope.focusActiveTab = function () {
        $scope.executeWithTimeout(() => {
          const isCountryActive = $scope.isTabActive('chooseCountry');
          const tabId = isCountryActive ? 'chooseCountry' : 'chooseLanguage';
          const tabElement = $scope.getTabElement(tabId);

          if (tabElement) {
            tabElement.focus();
          }
        });
      };

      $scope.focusLastElementOfActiveTab = function () {
        const isCountryActive = $scope.isTabActive('chooseCountry');

        $scope.executeWithTimeout(() => {
          if (isCountryActive) {
            // Focus last country
            const countries = document.querySelectorAll(SELECTORS.COUNTRIES);
            const lastCountry = countries[countries.length - 1];
            if (lastCountry) {
              lastCountry.focus();
            }
          } else {
            const languages = document.querySelectorAll(SELECTORS.LANGUAGES);
            const lastLanguage = languages[languages.length - 1];
            if (lastLanguage) {
              lastLanguage.focus();
            }
          }
        });
      };

      $scope.focusActiveRegion = function () {
        const regions = $scope.getRegionElements();
        const activeIndex = $scope.getActiveRegionIndex(regions);

        $scope.executeWithTimeout(() => {
          const targetRegion = activeIndex !== -1 ?
              regions[activeIndex] : document.getElementById('region-0');

          if (targetRegion) {
            targetRegion.focus();
          }
        });
      };

      $scope.focusActiveRegionOrDefault = function () {
        const regions = $scope.getRegionElements();
        const activeIndex = $scope.getActiveRegionIndex(regions);

        if (activeIndex !== -1) {
          regions[activeIndex].focus();
        } else {
          const region0 = document.getElementById('region-0');
          if (region0) {
            $scope.clickAndFocus(region0);
          }
        }
      };

      $scope.focusActiveRegionCountry = function () {
        const regions = $scope.getRegionElements();
        const activeIndex = $scope.getActiveRegionIndex(regions);

        if (activeIndex !== -1) {
          $scope.focusCountryInRegion();
        } else {
          $scope.executeWithTimeout(() => {
            $scope.clickElement('region-0');
            setTimeout(() => $scope.focusCountryInRegion(), 100);
          });
        }
      };

      $scope.getRegionElements = function () {
        return Array.from(document.querySelectorAll(SELECTORS.REGIONS));
      };

      $scope.getActiveRegionIndex = function (regions) {
        return regions.findIndex(region =>
            angular.element(region).hasClass('active')
        );
      };

      $scope.getActiveItemIndex = function (items) {
        return items.findIndex(item =>
            angular.element(item).hasClass('active') ||
            document.activeElement === item
        );
      };

      $scope.calculateNextIndex = function (currentIndex, length, key) {
        const index = currentIndex === -1 ? 0 : currentIndex;

        if (key === KEYS.ARROW_DOWN) {
          return (index + 1) % length;
        } else {
          return (index - 1 + length) % length;
        }
      };

      $scope.getTabElement = function (tabId) {
        return document.getElementById(tabId)?.children[0];
      };

      $scope.clickElement = function (elementId) {
        const element = document.getElementById(elementId);
        if (element) element.click();
      };

      $scope.clickAndFocus = function (element) {
        element.click();
        element.focus();
      };

      $scope.focusCountryInRegion = function () {
        $scope.executeWithTimeout(() => {
          const country0 = document.getElementById('country-0');
          if (country0) {
            country0.focus();
          }
        });
      };

      $scope.getCenter = function(rect) {
        return {
          x: rect.left   + rect.width  / 2,
          y: rect.top    + rect.height / 2
        };
      };

      // boolean for “is this rect in the pressed direction?”
      $scope.getDirectionPredicate = function(key, center) {
        const { x: cx, y: cy } = center;
        switch (key) {
          case KEYS.ARROW_LEFT:
            return rect => rect.right  < cx;
          case KEYS.ARROW_RIGHT:
            return rect => rect.left   > cx;
          case KEYS.ARROW_UP:
            return rect => rect.bottom < cy;
          case KEYS.ARROW_DOWN:
            return rect => rect.top    > cy;
          default:
            return null;
        }
      };

      // Combines Euclidean distance plus a small “off‑axis” penalty
      $scope.computeScore = function(currCenter, targetCenter, key) {
        const dx = targetCenter.x - currCenter.x;
        const dy = targetCenter.y - currCenter.y;
        const distance = Math.hypot(dx, dy);

        const offAxis = (key === KEYS.ARROW_LEFT || key === KEYS.ARROW_RIGHT)
            ? Math.abs(dy)
            : Math.abs(dx);

        const PENALTY_FACTOR = 2;
        return distance + offAxis * PENALTY_FACTOR;
      };

      $scope.executeWithTimeout = function (callback, delay = 0) {
        $timeout(callback, delay);
      };

      // Add a 0ms timeout to the click() event to prevent the $rootScope:inprog angular error when the ng-change event tries to run (caused by the click) before the ng-keydown event finishes
      // this timeout schedules the click() event to run right after the ongoing one
      $scope.queueElementClick = function(element) {
        if (element) {
          $timeout(function() {
            element.click();
          }, 0);
        }
      }

      $timeout(function() {
        if ($scope.variables.countrySelector == "disabled" || $scope.variables.countrySelector == "hidden") {
          return;
        } else {
          var localeSelectorElement = document.getElementById("localeSelector");
          var chooseCountryElement = document.getElementById("chooseCountry");
          var chooseLanguageElement = document.getElementById("chooseLanguage");
          if (localeSelectorElement) {
            localeSelectorElement.getElementsByTagName('ul')[0].setAttribute('role', 'tablist');
          }
          if (chooseCountryElement) {
            chooseCountryElement.getElementsByTagName('a')[0].setAttribute('role', 'tab');
          }
          if (chooseLanguageElement) {
            chooseLanguageElement.getElementsByTagName('a')[0].setAttribute('role', 'tab');
          }
        }
        $scope.http('GET', '/locale/options', {}, function (result) {
          $scope.localeDetails.result = result;
          $scope.countries = result.countries;
          if ($scope.isInlineCheckout) {
            const preferredOrder = ['da', 'de', 'en', 'es', 'fr', 'hr', 'it', 'nl', 'no', 'pl', 'pt', 'sk', 'fi', 'sv', 'tr', 'cs', 'ru', 'ar', 'zh', 'ja', 'ko'];
            $scope.languages = result.languages.sort(function (a, b) {
              return preferredOrder.indexOf(a.code) - preferredOrder.indexOf(b.code);
            });
          } else {
            $scope.languages = result.languages;
          }
          setCountriesList($scope.country, $scope.language, $scope.regions);
        })}, 0);

      function setCountriesList(currentCountry, currentLanguage, regionsList) {
        var currentRegion = null;
        var regionSet = {};

        angular.forEach($scope.countries, function (o) {
          if (o.region != null && o.region.length > 0) {
            if (!angular.isDefined(regionSet[o.region])) {
              regionSet[o.region] = {
                name: o.region,
                display: $filter('phrase')('Region' + o.region),
                countries: []
              };
            }
            regionSet[o.region].countries.push(o);
            if (o.code == currentCountry) {
              currentRegion = regionSet[o.region];
            }
            o.display = o.name;
            if ($scope.localeDetails.result) {
              o.top = $scope.localeDetails.result.top.indexOf(o.code) >= 0;
            }
            if (angular.isDefined(o.translations) && angular.isDefined(o.translations[currentLanguage])) {
              o.display = o.translations[currentLanguage];
            }
          }
        });

        angular.forEach(regionSet, function (o, k) {
          regionsList.push(o);
        });

        if (currentRegion != null) {
          $scope.chooseRegion(currentRegion);
        }

        $scope.localeDetails.loaded = true;
      }

      $scope.postalTax = {};

      var loaded = false;
      function updatePostalPhrase() {
        if ($scope.postalTax.calculating) {
          $scope.postalTax.taxPhrase = $filter('phrase')('Calculating');
        } else if (loaded) {
          if ($scope.taxValue === 0) {
            $scope.postalTax.taxPhrase = $filter('phrase')('TaxNotApplicable');
          } else {
            $scope.postalTax.taxPhrase = $scope.tax + " (" + $scope.taxRate + ")";
          }
        } else if ($scope.postalTax.calculating === undefined) {
          $scope.postalTax.taxPhrase = $filter('phrase')('EnterZipToCalculate');
        }
      }

      function getZipCodeForTax(contact, recipient) {
        if (recipient && recipient.selected) {
          return recipient.address && recipient.address.postalCode;
        } else if (contact) {
          return contact.postalCode;
        }
      }

      $scope.handlePatternForPostalCodes = (function() {
        return {
          test: function(value) {
            if($scope.country === 'CA') {
              let regex = /^[AaBbCcEeGgHhJ-Nj-nPpRrSsTtVvXxYy]\d[AaBbCcEeGgHhJ-Nj-nPpRrSsTtV-Zv-z][ -]?\d[AaBbCcEeGgHhJ-Nj-nPpRrSsTtV-Zv-z]\d$/
              return (value.length > 0) ? regex.test(value) : true;
            } else {
              return true;
            }
          }
        }
      })();

      var debouncer;
      $scope.determineTax = function() {
        window.clearTimeout(debouncer);
        var postalCode = getZipCodeForTax($scope.contact, $scope.recipient);
        if (postalCode && postalCode.length > 4) {
          debouncer = window.setTimeout(doTaxRequest, 250);
        } else {
          loaded = false;
          $scope.postalTax.calculating = undefined;
          updatePostalPhrase();
        }
      };

      // Clone the recipient info from the purchaser contact
      $scope.populateRecipientContact = function() {
        if ($scope.displaySeparateBillingInfo) {
          $scope.recipient.email = $scope.contact.email;
          $scope.recipient.firstName = $scope.contact.firstName;
          $scope.recipient.lastName = $scope.contact.lastName;
          $scope.recipient.company = $scope.contact.company;
          $scope.recipient.address.country = $scope.contact.country;
          $scope.recipient.address.state = $scope.contact.state;
          $scope.recipient.address.region = $scope.contact.region;
          $scope.recipient.address.city = $scope.contact.city;
          $scope.recipient.address.addressLine2 = $scope.contact.addressLine2;
          $scope.recipient.address.addressLine1 = $scope.contact.addressLine1;
          $scope.recipient.address.postalCode = $scope.contact.postalCode;
          doTaxRequest();
        }
        $scope.sendResizeMessage();
      }

      $scope.resetPostalCode = function() {
        if (!$scope.displaySeparateBillingInfo) {
          if ($scope.recipient && $scope.recipient.selected) {
            $scope.contact.postalCode = null;
          } else {
            $scope.recipient.address.postalCode = null;
          }
          doTaxRequest();
        }
      }

      var doTaxRequest = function() {
        loaded = false;
        var postalCode = getZipCodeForTax($scope.contact, $scope.recipient);
        const currentPaymentOption = $scope.payment.optionType;
        const currentPaymentOptionDetails = $scope.paymentOptions.find(paymentOption => paymentOption.type === currentPaymentOption);
        const paymentRequiresPostalCode = !currentPaymentOptionDetails ? false : currentPaymentOptionDetails.requireBillingPostal;
        if (!$scope.postalTax.calculating && doTaxRequest.lastPostalCode !== postalCode && paymentRequiresPostalCode) {
          $scope.postalTax.calculating = true;
          $scope.http('POST', '/tax', {
            postalCode: postalCode
          }, function success(result) {
            if($scope.country
                && $scope.regionList[$scope.country]
                && $scope.regionList[$scope.country].some(region => region.abbreviation === result.order.region)) {
              if($scope.contact.region != result.order.region){
                result.order.taxExempt = false;
              }
              $scope.contact.region = result.order.region;
            }
            if($scope.fields && $scope.fields.taxExemptId) {
              if ($scope.fields.taxExemptId !== undefined && $scope.fields.taxExemptId !== null && $scope.fields.taxExemptId !== "") {
                $scope.submitVatId();
              }
            }
            // Fixing for refresh on Quotes when doTaxRequest
            $scope.payment.refreshForTaxRequest = true;

            $scope.refreshOrderResponse(result, true, false);

            $scope.payment.refreshForTaxRequest = false;
            $scope.postalTax.calculating = false;
            loaded = true;
            updatePostalPhrase();

            doTaxRequest.lastPostalCode = postalCode;
          }, function fail() {
            $scope.postalTax.calculating = loaded = false;
            updatePostalPhrase();
          }, true);

        }
        if (doTaxRequest.lastPostalCode === postalCode) {
          loaded = true;
        }
        updatePostalPhrase();
        //$scope.$apply();
      };

      $scope.processing = {};

      $scope.openResponsiveCart = function() {

        if ($scope.paymentModal) {
          $scope.paymentModal.dismiss('cancel');
        }

        $scope.responsiveCartModal = $modal.open({
          scope: $scope,
          backdrop: false,
          keyboard: true,
          templateUrl: 'responsiveCartModal.html',
          windowClass: 'responsiveCart dialog-small remove-transform',
          controller: modalCtrl
        });

        $scope.responsiveCartModal.opened.then(setTimeout(function() {
          //if there are cross sells in scope add a condition here later
          //this will add the sidebar
          var divElement = angular.element(document.querySelector('#app > div.modal.fade.ng-isolate-scope.responsiveCart.in > div'));
          var sideBarElement = angular.element(document.getElementById('mg-lg-crossSell-display'));
          divElement.append(sideBarElement);
          if (isIE() && isIE() <= 9) {
            setPlaceHolders();
          }
          if ((/iPhone|iPod|iPad/i.test(navigator.userAgent))) {
            window.scrollTo(0, 0);
          }

        }, 100));

        function modalCtrl($scope, $modalInstance, $filter, subscriptions, env) {

          $scope.cancel = function(closePopup) {
            $scope.responsiveCartModal.dismiss('cancel');
            $scope.callParent({
              'action': 'scroll'
            });
            if(closePopup) {
              $scope.popupClose();
            } else {
              if($scope.isCartSelected) {
                $scope.$parent.isCartSelected = false;
                $scope.$parent.isCartViewEnabled = false;
              }
              $scope.choosePaymentOptionWithFields();
            }
            cardMonthYearMutationObserver();
            $scope.renderCaptchaWidget();
          };

          $scope.loaded = true;

        }
      }

      //keep managing amount of clicks recorded for all crossSells
      $scope.crossSellClicks = 0;

      //shift crossSells right
      $scope.moveRight = function () {
        var container = document.getElementById("responsive-cs-container");
        if($scope.crossSellClicks == $scope.allCrossSells.length-2){
          $scope.crossSellClicks = 0;
          $scope.barScroll(container,'left',30,210 * $scope.allCrossSells.length, 55);
        } else {
          $scope.crossSellClicks = $scope.crossSellClicks + 1;
          $scope.barScroll(container,'right',65,210,60);
        }
      };

      //shift crossSells left
      $scope.moveLeft = function () {
        var container = document.getElementById("responsive-cs-container");
        if($scope.crossSellClicks > 0) {
          $scope.crossSellClicks = $scope.crossSellClicks - 1;
          $scope.barScroll(container,'left',65,210,55);
        }
      };

      //generates the movement within the crossSells containers
      $scope.barScroll = function(element,direction,speed,distance,step){
        var scrollAmount = 0;
        var slideTimer = setInterval(function(){
          if(direction == 'left'){
              element.scrollLeft -= step;
            } else {
              element.scrollLeft += step;
            }
            scrollAmount += step;
            if(scrollAmount >= distance){
              window.clearInterval(slideTimer);
            }
        }, speed);
      }

      //format credit card
      $scope.formatMonth = function (month) {
        return (month >10) ? month.toString() : '0'+month.toString();
      }

      $scope.initializeKlarna = function() {

        // Load the Klarna Javascript SDK
        window.initKlarna = window.initKlarna || function() {
          try {
            Klarna.Payments.init({
              client_token: $scope.klarnaClientToken
            });
          } catch (e) {
            $scope.klarnaState = 'init-error';
            $scope.messages.push({
              "type": "danger",
              "phrase": "KlarnaNotAvailable"
            });
            $scope.$apply();
          }

          Klarna.Payments.load({
                container: '#klarna-payments-container',
                payment_method_category: 'pay_now'
              },
              {},
              (res) => {
                if (res.show_form) {
                  $scope.klarnaState = 'initialized';
                } else {
                  $scope.klarnaState = 'init-error';
                  $scope.messages.push({
                    "type": "danger",
                    "phrase": "KlarnaNotAvailable"
                  });
                  $scope.$apply();
                }
              }
          );
        }

        $scope.klarnaState = 'initializing';
        $scope.http('GET', '/payment-context', {},
          function contextSuccessHandler(result) {
            $scope.klarnaClientToken = result.clientToken;
            $scope.klarnaSessionId = result.sessionId;
            $scope.klarnaContextId = result.contextId;

            window.initKlarna();
          },
          function contextErrorHandler(err) {
            $scope.klarnaState = 'init-error';
            // clear out other messages, if any
            while ($scope.messages.length > 0) { $scope.messages.pop(); }
            $scope.messages.push({
              "type": "danger",
              "phrase": "KlarnaNotAvailable"
            });
            $scope.$apply();
            return;
          }
        );
      }

      $scope.payWithExpressPaymentMethod = function(form, paymentType) {
        form.paymentType = paymentType;
        
        if (paymentType === PIX_PAYMENT_METHOD) {
          $scope.payment.optionType = paymentType
          $scope.showPixLoadingSpinner = true;
        }

        $scope.choosePaymentOptionWithFields();
        $scope.modalCtrlRef($scope, $modal, $filter, subscriptions, env);
        $scope.doPayment(form);
        form.paymentType = null;
      }
      
      $scope.expressPaymentButtonAvailable = function (paymentMethod) {
        let showExpirationMessage = $scope.showExpirationMessage;
        if (paymentMethod === GOOGLE_PAY || paymentMethod === APPLE_PAY) {
          showExpirationMessage = false;
        }
        return $scope.expressCheckoutButtons.indexOf(paymentMethod) >= 0 && !showExpirationMessage && (!$scope.showLastExpressPaymentMethodUsed  || $scope.lastExpressPaymentMethodUsed === paymentMethod);
      }
      
      $scope.getExpressCheckoutButtonClass = function() {
        return $scope.showLastExpressPaymentMethodUsed ? 'inline-express-button-1' : 'inline-express-button-' + $scope.expressCheckoutButtons.length;
      }

      $scope.hasInvalidFields = function() {
          // the idea here is to check for any field that is required but not present or new fields in future that may be required
          if ($scope.variables.showCompanyField === 'require' && (!$scope.contact.company || $scope.contact.company.trim() === '')) {
            return true;
          }
      }

      $scope.startGooglePay = function() {
        $scope.complianceData.submitted = true;
        if( $scope.hasInvalidFields() ){
          return;
        }
        // check for company error or other field that may be required and is not present
        if ($scope.complianceData.enabled && !$scope.complianceData.checked && !$scope.enableNewTermsAndPolicy){
          return;
        }

        if ($scope.session.googlePayUrl) {
          $scope.GAsend(5, 'Payment Started', 'GooglePay');
          $scope.choosePaymentOptionWithFields();
          $scope.modalCtrlRef($scope, $modal, $filter, subscriptions, env);

          window.removeEventListener("message", $scope.googlePayCallback);
          window.addEventListener("message", $scope.googlePayCallback);
          $scope.openGooglePayWindow();
        }
      }

      $scope.googlePayCallback = function(event) {
        if (!$scope.session.googlePayUrl.startsWith(event.origin) && event.origin != document.location.origin) {
          console.log("Skipping Event from different origin.", event.origin);
          return;
        }
        if (!event.data.token) {
          $scope.closeGooglePayWindow('close');
          return;
        }

        let contact = event.data.billingContact || {};
        angular.extend(contact, event.data.shippingContact || {});
        let firstname = contact.name.indexOf(" ") > 0 ? contact.name.split(" ")[0] : contact.name;
        let lastname = contact.name.indexOf(" ") > 0 ? contact.name.split(" ")[1] : "";
        $scope.country = contact.countryCode;
        $scope.contact.firstName = firstname;
        $scope.contact.lastName = lastname;
        $scope.contact.addressLine1 = contact.address1;
        $scope.contact.addressLine2 = contact.address2;
        $scope.contact.region = contact.administrativeArea;
        $scope.contact.country = contact.countryCode;
        $scope.contact.city = contact.locality;
        $scope.contact.postalCode = contact.postalCode;
        $scope.contact.validPostalCode = contact.validPostalCode;
        $scope.contact.email = $scope.contact.email || $scope.hasAccount ? $scope.contact.email : event.data.email;
        $scope.contact.phoneNumber = event.data.phoneNumber;
        $scope.subscriptionCheckbox.autoRenew = $scope.hasRecurring;
        $scope.googlepay = {
          token: event.data.token,
          email: event.data.email
        };

        // Submit the form
        form.paymentType = 'googlepay';
        $scope.doPayment(form);
      }

      $scope.startApplePay = function(form){
        if ($scope.enableEmbeddedApplePay && $scope.applePayEmbeddedLoading) {
          return;
        }
        $scope.applepay.showMessage = true;
        $scope.complianceData.submitted = true;
        if ($scope.complianceData.enabled && !$scope.complianceData.checked && !$scope.enableNewTermsAndPolicy){
          return;
        }
        if ($scope.hasInvalidFields()) {
            return;
        }
        if ($scope.session.applePayUrl) {
          $scope.GAsend(5, 'Payment Started', 'ApplePay');
          $scope.openApplePayWindow();
        }
      }

      $scope.applePayCallback = function(event) {
        if ((!$scope.session.applePayUrl.startsWith(event.origin)) && event.origin != document.location.origin) {
          console.log("Invalid Event origin, skipping event", event);
          return;
        }

        const type = event?.data?.type || '';
        if (type === TURNSTILE_TOKEN) {
          // Ignore Turnstile events. Apple Pay callbacks can have various message types,
          // and there's no guarantee that Apple enforces a "applepay:XYZ" type pattern.
          // Using known non-ApplePay types to safely filter out unrelated messages.
          return;
        }

        // Apple Pay loaded
        if (event.data.action != null && event.data.action === 'load-complete') {
          $scope.applePayEmbeddedLoading = false;
          $scope.$apply();
          return;
        }

        // Apple does not support embedded, show popup
        if (event.data.action != null && event.data.action === 'unsupported'){
          $scope.enableEmbeddedApplePay = false;
          $scope.enableEmbeddedNativeApplePay = false;
          return;
        }

        if (!$scope.doPayment && type === APPLE_PAY_EVENT_TYPE) {
          $scope.choosePaymentOptionWithFields();
          $scope.modalCtrlRef($scope, $modal, $filter, subscriptions, env);
        }

        // Apple Pay disabled, fallback CC
        if (event.data.action != null && event.data.action === 'disabled'){
          let usedEmbeddedApplePay = $scope.enableEmbeddedApplePay;
          $scope.enableEmbeddedApplePay = false;
          $scope.enableEmbeddedNativeApplePay = false;
          if (!$scope.isAccordionView) {
            $scope.payment.optionType = 'card';
            $scope.choosePaymentOption(true, true, true);
            if (event.data.error) {
              $scope.messages.push({ "type": "danger","phrase": event.data.error});
            }
          } else if ($scope.expressCheckoutButtons) {
            $scope.expressCheckoutButtons = $scope.expressCheckoutButtons.filter(item => item !== 'applepay');
            $scope.applePayDisabled = true;
            if (event.data.error && !usedEmbeddedApplePay) {
              $scope.messagesExpress = [{ "type": "danger","phrase": event.data.error}];
              $scope.closeApplePayWindow('close');
            }
            
            if ($scope.lastExpressPaymentMethodUsed === APPLE_PAY) {
              $scope.lastExpressPaymentMethodUsed = SHOW_OTHER_PAYMENT_METHODS; //Disable applepay as the lastExpressPaymentMethodUsed if not available
              $scope.showLastExpressPaymentMethodUsed = false;
            }
            
            $scope.$apply();
          }
          return;
        }

        if (event.data.action != null && event.data.action === 'complianceCheckbox') {
          $scope.complianceData.submitted = true;
          $scope.focusOnFirstInvalidField();
          return;
        }

        if (event.data.error) {
          $scope.messages.push({ "type": "danger","phrase": event.data.error});
          $scope.closeApplePayWindow('close');
          $scope.$apply();
          return;
        }

        if (!event.data.data) {
          $scope.closeApplePayWindow('close');
          return;
        }
        if ((!event.data.transactionIdentifier) || (!event.data.signature) || (!event.data.version)) {
          $scope.applepay.data = null;
          return;
        }
        $scope.applepay.data = event.data.data;
        $scope.applepay.version = event.data.version;
        $scope.applepay.signature = event.data.signature;
        $scope.applepay.header = event.data.header;
        $scope.applepay.billingContact = event.data.billingContact;
        $scope.applepay.shippingContact = event.data.shippingContact;
        $scope.applepay.paymentMethod = event.data.paymentMethod;
        $scope.applepay.transactionIdentifier = event.data.transactionIdentifier;
        $scope.applepay.email = event.data.email;
        $scope.applepay.fullName = event.data.fullName;
        $scope.applepay.phone = event.data.phone;
        form.paymentType = 'applepay';

        // Submit the form
        $scope.doPayment(form);
        form.paymentType = null;
      }
      if ($rootScope.applePayCallbackIsSetup === undefined) {
        $rootScope.applePayCallbackIsSetup = true;
        window.addEventListener("message", $scope.applePayCallback);
      }


      $scope.subscriptionDetails = function() {
        $scope.isToday = subscriptions.isToday;
      };

      $scope.shouldShowSubscriptionCheckbox = function() {
        return (
          !$scope.hasPerpetualProduct($scope.itemsArray) &&
          $scope.subscriptionCheckbox.display &&
          !$scope.isConfirmingInformation &&
          !($scope.savedPaymentMethod && $scope.showExpirationMessage) &&
          !($scope.itemsArray.orderSubscriptionsAdhocCount > 0)
        );
      };

      $scope.choosePaymentOptionWithFields = function() {
        $scope.updateFormSubmitted(false);
        $scope.loaded = false;

        var popupContainers = Array.from(document.querySelectorAll('.modal'));
        var popupContainer = popupContainers.filter(function(popup) {
          return popup && "classList" in popup && popup.classList.contains('inline-checkout-modal');
        });
        if (!$scope.isInlineCheckout || ($scope.isInlineCheckout && !popupContainer.length) && !$scope.isAccordionView) {
          $scope.paymentModal = $modal.open({
            scope: $scope,
            backdrop: false,
            keyboard: $scope.isInlineCheckout ? false : true,
            templateUrl: 'paymentField.html',
            windowClass: 'dialog-small remove-transform' + ($scope.isInlineCheckout ? ' inline-checkout-modal' : ' popup-checkout-modal'),
            controller: modalCtrl
          });


          $scope.paymentModal.opened.then(function() {
            setTimeout(
                function() {
                  isRegionInList($scope.contact.country, $scope.contact);
                  if (isIE() && isIE() <= 9) {
                    setPlaceHolders();
                  }
                  if ((/iPhone|iPod|iPad/i.test(navigator.userAgent))) {
                    window.scrollTo(0, 0);
                  }

                  // remove other modals
                  if (popupContainers !== null) {
                    popupContainers.forEach(function(modal) {
                      if (modal.parentNode){
                        modal.parentNode.removeChild(modal);
                      }
                    });
                  }
                },
                50
            );
          });
        }

        function modalCtrl($scope, $modalInstance, $filter, subscriptions, env) {

          $scope.$on('redirect_3ds_success', function(e, url) {
            window.removeEventListener('unload', $scope.popupClose);
            location.href = appendQueryStringToUrl(url, location.search);
          });

          $scope.$on('redirect_sepa_success', function(e, url) {
            window.removeEventListener('unload', $scope.popupClose);
            location.href = appendQueryStringToUrl(url, location.search);
          });

          $scope.$on('redirect_3ds_failure', function(e, messageData) {
            $scope.processing.freeze = false;
            $scope.processingThreeDS = false;
            $scope.messages = [
              {
                "type": "danger",
                "phrase": messageData && messageData.phrase ? messageData.phrase : "CardDeclined"
              }
            ];
            $scope.$apply();
          });

          $scope.$on('error_sepa_bank_login', function(e) {
            $scope.messages.push({
              "type": "danger",
              "phrase": "SepaLoginBankError"
            });
            $scope.$apply();
          });

          if ($scope.option && 'klarna' === $scope.option.type) {
            $scope.option.requireShipping = false;
            $scope.variables.forcePhoneNumberCollection = "true";
            $scope.variables.forcePhysicalAddressCollection = "true";
            $scope.countryRequiresPostalCode = true;

            if (!$scope.klarnaState) {
              $scope.initializeKlarna();
            }
          }

          var submittedEmail = false;
          var submitted = false;
          var trialHoppingCheckFound = false;
          $scope.showAmPortalButton = false;
          $scope.trialConcurrencyAmPortalUrl = '';

          $scope.subscriptionDetails = function() {
            $scope.isToday = subscriptions.isToday;
          };

          $scope.isEmailModalNeeded = function() {
            if ($scope.$parent.variables.requireEmail == 'true' && !$scope.$parent.hasAccount && !$rootScope.validEmail) {
              return true;
            } else {
              return false;
            }
          };

          $scope.proceedWithEmail = function(form) {
            submittedEmail = true;
            if (form.$invalid) {
              $scope.invalid = true;
              return;
            }
            $scope.invalid = false;
            $rootScope.validEmail = true;
            $scope.renderCaptchaWidget();
          };

          $scope.card = {
            year: '',
            month: '',
            monthYear: ''
          };


          $scope.sepa = {
            iban: '',
            ipAddress: $scope.session.ipAddress === '0:0:0:0:0:0:0:1' ? '127.0.0.1' : $scope.session.ipAddress
          };
          $scope.cpfNumber = '';

          $scope.captcha = {
                captchaType: '',
                token: '',
                errorCode: ''
          };

          $scope.setCaptchaData = function(captchaType, token) {
            $scope.$apply(function() {
                  $scope.captcha.captchaType = captchaType;
                  $scope.captcha.token = token;
                  $scope.captcha.errorCode = '';
                  var maybeForm = lookupAngularVar( $scope,'form')
                  if( maybeForm ){
                    maybeForm.$setValidity('captcha', true);
                  }
                  debug('setCaptchaData', $scope.captcha, maybeForm, 'form');
            });
          }

            window.addEventListener("message", function(event) {
                const { type, data } = event.data;
                if (type === TURNSTILE_TOKEN) {
                    debug("Received turnstileToken:", data);
                    angular.element(document.getElementById('captcha')).scope().setCaptchaData('fs-tcaptcha', data)
                }
            });

          $scope.ach = {
            routingNum: '',
            accountType: '',
            accountNum: '',
            confirmAccountNumber: ''
          };
          $scope.applepay = {
            showMessage: false,
            data: '',
            version: '',
            signature: '',
            header: ''
          };
          $scope.upi = {
            mobileAppSelected: '',
            requestMobileExperience: false
          };

          $scope.savedFormInfo = '';

          $scope.isConfirmingInformation = false;
          $scope.cancelConfirmInfo = function() {
            $scope.isConfirmingInformation = false;
          }
          $scope.okConfirmInfo = function() {
            $scope.isConfirmingInformation = false;
          }
          $scope.startConfirmInfo = function() {
            $scope.isConfirmingInformation = true;
          }

          /**
           * India's UPI (a payment method type) allows for buyers to select a mobile application to complete the payment.
           * E.g: buyers can use Gpay or Phonepe to process the UPI payment. Any other payment method types that use a
           * similar convention should leverage the following attribute.
           */
          $scope.selectedMobilePaymentApp = function(selectedApp) {
            $scope.mobileAppSelected = selectedApp;
          }

          $scope.checkComplianceBox = function(frame){
            $scope.notifyChildIFrames();
          }

          $scope.customerReference = {};
          $scope.billingPostal = {};
          $scope.invalid = false;
          $scope.processing.freeze = false;

          $scope.selectInfo = function (index) {
            setTimeout(function() {
              if (document.getElementById('payment-method-'+index)){
                document.getElementById('payment-method-'+index).focus();
              }
              }, 500);
            }

          $scope.resetRemoteValidation = function(field, optFieldTwo) {
            if (field) {
              field.$setValidity('remote-validation', true);
            }
            if (optFieldTwo) {
              optFieldTwo.$setValidity('remote-validation', true);
            }
          };

          $scope.addAlert = function(msg) {
            $scope.messages.push({
              phrase: msg
            });
          };

          $scope.addAlertFront = function(msg) {
            $scope.messages.unshift({
              phrase: msg
            });
          };

          $scope.closeMessage = function(index) {
            $scope.messages.splice(index, 1);
          };


          $scope.captchaErrorCode = function() {
            return $scope.captcha.errorCode;
          }
          /***************************************************
          ***** Screen Reader related functions START ********
          /**************************************************/

          function logException(e) {
            console.log(e);
          }

          function getInvalidFieldNames() {
            var invalidFiledNames = [];
            try {
              var invalidFields = document.getElementsByClassName('has-error invalid-field-icon');
              [].forEach.call(invalidFields, function(element) {
                var invalidField = element.querySelector('input, select');
                if (invalidField && invalidField.name) {
                  invalidFiledNames.push(formatFieldName(invalidField.name));
                  addScreenReaderMessage(invalidField, null, true);
                }
              });
            } catch(e) {
              logException(e);
            }
            return invalidFiledNames;
          }

          function focusOnFirstInvalidField() {
            try {
              $timeout(function() {
                // first invalid field can be input (ex: email) or select (ex: state)
                var firstInvalidFieldContainer = document.getElementsByClassName('has-error invalid-field-icon')[0];
                var invalidFieldNames = getInvalidFieldNames();
                if (firstInvalidFieldContainer) {
                  var firstInvalidField = firstInvalidFieldContainer.getElementsByTagName('input')[0]
                    ? firstInvalidFieldContainer.getElementsByTagName('input')[0] : firstInvalidFieldContainer.getElementsByTagName('select')[0];
                  if (firstInvalidField) {
                    if (USE_ERROR_FIELD_NAMES) {
                      var invalidFieldMessage = invalidFieldNames.length > 1 ? INVALID_FIELDS_MESSAGE : INVALID_FIELD_MESSAGE;
                      notifyScreenReaderOfInvalidForm(invalidFieldMessage + ': ' + invalidFieldNames.join("; ") + '. ' + STRING_FOCUS + formatFieldName(firstInvalidField.name));
                    } else {
                      if (invalidFieldNames.length > 1) {
                        notifyScreenReaderOfInvalidForm((' There are ' + invalidFieldNames.length + ' invalid fields. ' + STRING_FOCUS + formatFieldName(firstInvalidField.name)));
                      } else {
                        notifyScreenReaderOfInvalidForm((' There is ' + invalidFieldNames.length + ' invalid field. The focus is on the invalid field ' + formatFieldName(firstInvalidField.name)));
                      }
                    }
                    firstInvalidField.focus();
                  }
                }
              }, 0);
            } catch(e) {
              logException(e);
            }
          }

          $scope.checkCardField = () => checkField($scope.validCard, 'showCardError');
          $scope.checkExpireField = () => checkField($scope.validExpire, 'showExpireError');
          $scope.checkCvcField = () => checkField($scope.validCvc, 'showCvcError');

          $scope.checkCardFields = () => {
              $scope.checkCardField();
              $scope.checkExpireField();
              $scope.checkCvcField();
          };

          $scope.checkCaptchaToken = (form) => {
            if( $scope.payment.optionType != "card"){
              $scope.captcha.errorCode = '';
              return;
            }
            if( !$scope.session || !$scope.session.captchaRequired ){
              $scope.captcha.errorCode = '';
            }else{
              if( $scope.captcha.token === '' ){
                if( 'INVISIBLE' === $scope.variables.captchaMode ){
                    var captchaElement = document.getElementById( "captcha" )
                    if( captchaElement && captchaElement.offsetHeight > 0 ){
                        $scope.captcha.errorCode = 'CaptchaIsEmptyError';
                    }else {
                        $scope.captcha.errorCode = 'CaptchaInvisibleIsEmptyError';
                    }
                }else{
                  $scope.captcha.errorCode = 'CaptchaIsEmptyError';
                }
              }
            }
          }

          $scope.validCard = function() {
            if (!$scope.formSubmitted) return '';
            let card = $scope.card?.number?.trim();

            // Rules
            // 0. Empty
            if (!card) {
              return "EnterYourCardNumber";
            }

            // 0. Delete white spaces
            card = card.replace(/\s+/g, '');
            if (card.length < 13) {
              return "CardNumberIsTooShort";
            }

            // Luhn validation
            if (shouldApplyLuhn(card) && !luhnCheck(card)) {
              return "CardNumberIsInvalid";
            }

            if($scope.hasServerSideError('card.number')) {
              return "CardNumberIsInvalid";
            }
            return "";
          };

          function luhnCheck(cardNumber) {
            let sum = 0;
            let shouldDouble = false;

            for (let i = cardNumber.length - 1; i >= 0; i--) {
              let digit = parseInt(cardNumber.charAt(i));

              if (shouldDouble) {
                digit *= 2;
                if (digit > 9) digit -= 9;
              }

              sum += digit;
              shouldDouble = !shouldDouble;
            }

            return sum % 10 === 0;
          }

          function shouldApplyLuhn(cardNumber) {
            // Visa: starts with 4
            if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) {
              return true;
            }

            // Mastercard: starts with 51-55 or 2221-2720
            if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7([01]\d{12}|20\d{12})))$/.test(cardNumber)) {
              return true;
            }

            return false; // Don't apply Luhn to unknown/gift/UnionPay/etc.
          }

          $scope.validExpire = function () {
            if (!$scope.formSubmitted) return;

            let expire = $scope.card?.monthYear?.trim();
            if (!expire) {
              return "EnterYourExpire";
            }

            const parts = expire.replace(/\s/g, '').split('/');
            if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
              return "ExpireIsIncomplete";
            }

            let month = parseInt(parts[0], 10);
            let year = parseInt(parts[1], 10);

            // Month is valid
            if (isNaN(month) || month < 1 || month > 12) {
              return "ExpireIsInvalid";
            }

            // Dates in past
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear() % 100;

            if (year < currentYear || (year === currentYear && month < currentMonth)) {
              return "ExpireIsInPast";
            }

            return "";
          };


          $scope.validCvc = function () {
            if (!$scope.formSubmitted) return '';
            let security = $scope.card?.security?.trim();

            if (!security) {
              return "EnterYourCVC";
            }

            if (security.length < 3) {
              return "CVCIsTooShort";
            }

            if($scope.hasServerSideError('card.security')) {
              return "CardCvvInvalid";
            }
            return "";
          };

          $scope.limitEmailLength = function () {
            if ($scope.contact && $scope.contact.email) {
              if ($scope.contact.email.length > 255) {
                $scope.contact.email = $scope.contact.email.slice(0, 255);
              }
            }
          }

          // Handle card number paste event
          $scope.handleCardPaste = function(event) {

            $timeout(() => {
              const input = event.target;

              input.value = input.value.replace(/\D/g, '');
              $scope.card.number = input.value;
              $scope.formatCardNumber();

              if (!$scope.$$phase) {
                $scope.$apply();
              }
            }, 0);
          };


          $scope.formatCardNumber = function () {
            // Check if document is defined and the model is valid
            if (typeof document === 'undefined' || !$scope.card || !$scope.card.number) return;

            const input = document.getElementById('card-number');
            if (!input) return;

            let cursorPosition = input.selectionStart;
            const prevValue = input.value;

            // Clean and limit to 19 digits
            let cleaned = $scope.card.number.replace(/\D/g, '').slice(0, 19);
            let formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();

            // If the user deleted just after a space, move the cursor back
            if (prevValue && prevValue[cursorPosition - 1] === ' ' && cursorPosition > 0 && prevValue.length > formatted.length) {
              cursorPosition--;
            }

            $scope.card.number = formatted;
            input.value = formatted;
          };


          $scope.processCVC = function() {
            $scope.disableByKey('security');
            let input = $scope.card?.security || '';

            // Allow test case numbers
            if (input.startsWith('*')) {
              let cleaned = input.replace(/[^a-zA-Z0-9]/g, '');
              $scope.card.security = '*' + cleaned.slice(0, 4);
            } else {
              let digitsOnly = input.replace(/\D/g, '');
              $scope.card.security = digitsOnly.slice(0,4);
            }
          };


          function notifyScreenReaderOfInvalidForm(appendMessage) {
            setElementText(document.getElementById('generic-validation-msg'), '<span role="alert">' + INVALID_FORM_MESSAGE + appendMessage + '</span>');
          }

          function getDynamicZeroWidth() {
            var zeroWidth = '&#8203;';
            zeroWidthCounter = zeroWidthCounter === 1 ? 2 : 1;
            return Array(zeroWidthCounter).fill(zeroWidth).join('');
          }

          function setCountrySpecificFieldNames() {
            if ($scope.country === COUNTRY_CODES.US) {
              SCREEN_READER_FIELD_NAMES['postalCode'] = 'Zip';
              SCREEN_READER_FIELD_NAMES['region'] = 'State';
            } else if ($scope.country === COUNTRY_CODES.CANANDA) {
              SCREEN_READER_FIELD_NAMES['region'] = 'Province';
              SCREEN_READER_FIELD_NAMES['postalCode'] = 'postal code';
            } else {
              SCREEN_READER_FIELD_NAMES['region'] = 'region';
              SCREEN_READER_FIELD_NAMES['postalCode'] = 'postal code';
            }
          }

          function formatFieldName(fieldName) {
            var fieldNameExploded = fieldName.split('.');
            var excludeList = ['card', 'contact', 'ach'];
            setCountrySpecificFieldNames();
            if (fieldNameExploded.length === 2) {
              if (SCREEN_READER_FIELD_NAMES[fieldNameExploded[1]]) {
                fieldNameExploded[1] = SCREEN_READER_FIELD_NAMES[fieldNameExploded[1]];
              }
              if (excludeList.indexOf(fieldNameExploded[0]) !==1) {
                return fieldNameExploded.join(' ');
              }
              return fieldNameExploded[1];
            }
            return fieldName;
          }

          function addScreenReaderMessage(field, messageFieldName, isAriaLiveOff) {
            try {
              var validationMessageElement;
              if (messageFieldName) {
                validationMessageElement = document.getElementById(messageFieldName);
              } else {
                validationMessageElement = document.getElementById((field.$name ? field.$name : field.name) + '-validation-msg'); // var for older IE support, need to introduce transpilation.
              }
              if (validationMessageElement) {
                setElementText(validationMessageElement, appendZeroWidthToText(STRING_INVALID + ' ' + formatFieldName(field.$name ? field.$name : field.name)), isAriaLiveOff);
              }
            } catch(e) {
              logException(e);
            }
          }

          function setElementText(element, text, isAriaLiveOff) {
            if (element) {
              if (isAriaLiveOff) {
                element.setAttribute('aria-live', 'off');
              } else {
                if (element.getAttribute('aria-live') === 'off') {
                  element.setAttribute('aria-live', 'polite');
                }
              }
              element.innerHTML = text;
            }
          }

          // appending the zero widths makes the screen reader read the text again.
          function appendZeroWidthToText(text) {
            return text + getDynamicZeroWidth();
          }

          function triggerValidation() {
            if (!this.field.$pristine && this.field.$invalid ) {
              addScreenReaderMessage(this.field);
            }
          }

          $scope.triggerValidationOnEmptyField = function(field) {
            if (!field.$pristine && field.$invalid ) {
              if (field.$error && field.$error.required) {
                addScreenReaderMessage(field);
              }
            }
          }

          $scope.triggerScreenReaderValidation = function(field) {
            try {
              window.clearTimeout(screenReaderValidationDebouncer);
              var isEmailField = (field.$name.indexOf('email') !== -1);
              // email validation happens on blur. Give a longer timeout to let the focus happen to the next field and start screen reader messaging.
              screenReaderValidationDebouncer = window.setTimeout(triggerValidation.bind({field: field}), isEmailField ? 3000 : 0);
            } catch(e) {
              logException(e);
            }
          };

          $scope.isFieldValid = function(field) {
            return field && !field.$pristine && field.$invalid;
          }

          $scope.calculateYIQ = function (rgb) {
            const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (!match) return 255;
            const [r, g, b] = match.slice(1, 4).map(Number);
            return (r * 299 + g * 587 + b * 114) / 1000;
          };

          $scope.getComputedBackgroundMode = function (elementId) {
            const el = document.getElementById(elementId);
            if (!el) {
              $scope.cvvImageMode = 'light'; // fallback
              return;
            }

            const bgColor = window.getComputedStyle(el).backgroundColor;
            const yiq = $scope.calculateYIQ(bgColor);
            $scope.cvvImageMode = yiq <= 192.671 ? 'dark' : 'light';
          };

          $scope.$watch(function () {
            return document.getElementById('card-security');
          }, function (newVal) {
            if (newVal) {
              $scope.getComputedBackgroundMode('card-security');
              $timeout(function () {
                $scope.$apply();
              });
            }
          });

          // Re-DO logic for add card clases now is handled by input
          $scope.cardsDisplay = function(field) {
            const el = document.getElementById('card-number');
            const carousel = document.getElementById('cards-carousel');

            const logoClasses = [
              'visa', 'mastercard', 'amex', 'diners', 'discover', 'jcb',
              'electron', 'maestro', 'dankort', 'interpayment', 'unionpay', 'elo', 'hipercard'
            ];

            if (el) {
              logoClasses.forEach(function(cls) {
                el.classList.remove(cls);
              });
            }

            // Show carousel when nothing is present in input
            if (!field.$modelValue) {
              if (carousel) {
                carousel.style.display = "flex";
              }
              return;
            } else {
              if (carousel) {
                carousel.style.display = "none";
              }
            }

            // it there is something in the input we check and add class according.
            if (el) {
              const number = field.$modelValue;
              const cards = {
                unionpay: /((^62)(?!(212[6-9]|21[3-9][0-9]|2[2-8][0-9]{2}|29[0-1][0-9]|292[0-5]|[4-6][0-9]{3}|8[2-8][0-9][0-9])))\d{4,6}/,
                visa: /^4/,
                mastercard: /^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/,
                amex: /^(34|37)/,
                diners: /^(36|38|39|30[0-5]|3095)/,
                hipercard: /^384100|^384140|^384160|^606282|^637095|^637568|^637599|^637609|^637612/,
                discover: /^65|^64|^6011|((^62)(212[6-9]|21[3-9][0-9]|2[2-8][0-9]{2}|29[0-1][0-9]|292[0-5]|[4-6][0-9]{3}|8[2-8][0-9][0-9]))/,
                  // The DiscoverCard regex above is not accurate enough to differentiate between discover and elo. So make sure that elo is after discover so that any erroneous discover match can be replaced correctly by elo.
                elo: /^((451416)|(457393)|(504175)|(506)(699|7[0-6][0-9]|77[0-8])|(509)[0-9][0-9][0-9]|(627780)|(636297)|(63636[8-9])|(6500)(3[1-3]|3[5-9]|4[0-9]|5[0-1]|5[8-9]|69|7([0-1]|[7-8]))|(6504)(0[5-9]|1[0-9]|2[0-9]|3[0-9])|(650)(4(8[5-9]|9[0-9])|5([0-2][0-9]|3[0-8]))|(6505)(4[1-9]|[5-8][0-9]|9[0-8])|(6507)(0[0-9]|1[0-8])|(65072)[0-7]|(6509)(0[1-9]|[1-6][0-9]|7[0-8])|(6516)(5[2-9]|[6-7][0-9]|88)|(6550)([0-1][0-9])|(6550)(2[1-9]|[3-4][0-9]|5[0-8]))/,
                jcb: /^(352[89]|35[3-8][0-9])/
              };

              for (const card in cards) {
                if (cards.hasOwnProperty(card)) {
                  if (cards[card].test(number)) {
                    el.classList.add(card); // Le ponemos la clase
                  }
                }
              }
            }
          };

          $scope.resetCardInput = function () {
            $scope.card.number = "";
          }

          $scope.cvcDisplay = function (field) {

            let holder = document.getElementById('cvc-holder');

            if (holder){
              holder.style.right = "8px";
            }
          }
          /***************************************************
          ***** Screen Reader related functions END **********
          /**************************************************/

          $scope.next = function(form) {
            $scope.currentForm = form;
            $scope.updateFormSubmitted(true);
            submitted = true;
            $scope.messages = [];
            trialHoppingCheckFound = false;
            $scope.trialConcurrencyShowCustomDivision = false;
            $rootScope.trialConcurrencyShowCustomDivision = false;

            $scope.complianceData.submitted = $scope.complianceData.enabled && !$scope.complianceData.checked;

            // Ensure there is a separate email recipient if this is a gift, else we are mo
            if ($scope.recipient && $scope.recipient.selected
                && !$scope.displaySeparateBillingInfo
                && $scope.contact.email && $scope.recipient.email
                && $scope.contact.email.trim() === $scope.recipient.email.trim()) {
                $scope.invalid = true;
                if(form['contact.email']) {
                  form['contact.email'].$setValidity('remote-validation', false);
                }
                if(form['recipient.email']) {
                    form['recipient.email'].$setValidity('remote-validation', false);
                }
                $scope.addAlert('EmailMatch');
            }

            if($scope.customerReference && $scope.customerReference.id) {
              var customerReferenceRegex = new RegExp('^(?:[A-Za-z0-9 -]*)$');
              var customerReference = $scope.customerReference.id;
              if(!customerReferenceRegex.test($scope.customerReference.id)) {
                $scope.invalid = true;
                form['customerReference.id'].$setValidity('remote-validation', false);
                $scope.addAlert('CustomerReferenceInvalid');
                return;
              }
            }

            if ($scope.cpfNumber || form.cpfNumber) {
              const cpf = $scope.cpfNumber ? $scope.cpfNumber.replace(/\D*/g, '') : form.cpfNumber.$modelValue.replace(/\D/g, '');
              // A CPF is 11 digits long and a CPNJ is 14 digits long
              if (!/^\d{11}$|^\d{14}$/.test(cpf)) {
                $scope.invalid = true;
                form['cpfNumber'].$setValidity('remote-validation', false);
                $scope.cpfNumberInvalid = true;
                return;
              }
            }

            if (form.$invalid || $scope.complianceData.submitted) {
              $scope.invalid = true;
              focusOnFirstInvalidField();
              checkData(submitted);
              $scope.checkCardFields();
              if(!$scope.achNacha) {
                angular.element(document.querySelector("#achNachaCheckBox")).removeClass("alert-none");
                angular.element(document.querySelector("#achNachaCheckBox")).addClass("alert-danger");
              }
            } else if ($scope.messages.length === 0) {
              $scope.invalid = false;

              if (form.isPayPalInContext) {
                $scope.GAsend(5, 'Payment Started', 'PayPal');
                // Let PayPal in-context handler the payment flow.
                return;
              }

              // Show the Klarna window
              if ('klarna' === $scope.option.type) {
                // GA for each step of the Klarna payment process, so we can track where users drop off in the flow.
                $scope.GAsend(2, 'Name Entered', 'Klarna');
                $scope.GAsend(3, 'Email Entered', 'Klarna');
                $scope.GAsend(4, 'Payment Data Entered', 'Klarna');
                $scope.GAsend(5, 'Payment Started', 'Klarna');
                $scope.GAsend(6, 'Postal Code Entered', 'Klarna');
                const contact = $scope.contact;
                const billingAddress = {
                  given_name: contact.firstName,
                  family_name: contact.lastName,
                  email: contact.email,
                  street_address: contact.addressLine1,
                  postal_code: contact.postalCode,
                  city: contact.city,
                  phone: contact.phoneNumber,
                  country: $scope.country
                }
                // Did the purchaser already try to pay once and get an error? If so, the klarna data will be cleared out.
                // Do not allow the purchaser to re-try with Klarna at this time.
                if (!$scope.klarnaState || 'error-authorization-failed' === $scope.klarnaState) {
                  $scope.messages.push({
                    "type": "danger",
                    "phrase": "KlarnaNotAvailable"
                  });
                  $scope.$apply();
                  return;
                }
                const klarnaInitTimer = setInterval(() => {
                  if ('init-error' === $scope.klarnaState) {
                    clearInterval(klarnaInitTimer);
                    $scope.klarnaState = 'error-authorization-failed';
                    $scope.messages.push({
                      "type": "danger",
                      "phrase": "KlarnaAuthorizationFailed"
                    });
                    $scope.$apply();
                  } else if ('initialized' === $scope.klarnaState) {
                    clearInterval(klarnaInitTimer);
                    Klarna.Payments.authorize(
                        {
                          payment_method_category: 'pay_now'
                        },
                        {
                          billing_address: billingAddress
                        },
                        (res) => {
                          $scope.klarnaState = null;      // Make sure we pull another client token if the user tries to pay again.
                          if (res.approved) {
                            $scope.paymentKlarna = {
                              finalize_required: res.finalize_required,
                              authorization_token: res.authorization_token,
                              merchant_reference: res.merchant_reference2,
                              context_id: $scope.klarnaContextId,
                              session_id: $scope.klarnaSessionId,
                              client_token: $scope.klarnaClientToken
                            }
                            $scope.doPayment(form);
                          } else {
                            if (!res.show_form) {
                              $scope.klarnaState = 'error-authorization-failed';
                              $scope.messages.push({
                                "type": "danger",
                                "phrase": "KlarnaAuthorizationFailed"
                              });
                              $scope.$apply();
                            }
                          }
                          $scope.paymentKlarna = null;
                          $scope.klarnaClientToken = null;
                          $scope.klarnaSessionId = null;
                          $scope.klarnaContextId = null;
                        }
                    );
                  }
                }, 250);
                return;
              }

              // If postal required, server side validation of postal first.
              //if we do not have captcha token, it could be problem with vendor, network, or DNS
              //and if we block payment, then server side monitors will not get any data
              $scope.checkCaptchaToken(form);
              if(  $scope.captcha.errorCode === 'CaptchaIsEmptyError'){
                  debug('captcha token is not available, delaying payment call to server ');
                  $scope.processing.freeze = true;
                  $timeout(function() {
                      $scope.processing.freeze = false;//allow doPayment to run
                      $scope.doPayment(form);
                  }, 3000);
              }  else {
                  $scope.doPayment(form);
              }
            }
          };

          $scope.cancel = function() {

            /* If 3DS authentication iframe is on the page and the buyer tries to close
               we need to close the iframe and show the payment form
             */

            if ($scope.processingThreeDS == true) {
                $scope.processing.freeze = false;
                $scope.processingThreeDS = false;
            } else {
                $scope.popupClose();
            }
            $scope.renderCaptchaWidget();
          };

          if (!$scope.postalTax.taxPhrase) {
            $scope.postalTax.taxPhrase = $filter('phrase')('EnterZipToCalculate');
          }
          if ($scope.taxValue) {
            $scope.postalTax.taxPhrase = $scope.tax + " (" + $scope.taxRate + ")";
          }

          // If recognize gives us postal, calculate tax on load
          if (
            $scope.contact.postalCode &&
            !($rootScope.trialConcurrencyShowCustomDivision && $scope.isAccordionView) // prevent duplicate request when accordion and has trial concurrency
          ) {
            window.setTimeout(function() {
              $scope.determineTax();
            }, 100);
          }

          var instructionInterval = {};
          for (var i = 0; i < $scope.itemsArray.orderSubscriptions.length; i++) {
            var instructions = $scope.itemsArray.orderSubscriptions[i].subscription.instructions;
            for (var j = 0; j < instructions.length; j++) {
              if (instructions[j].type !== 'trial' && (instructions[j].intervalUnit !== instructionInterval.unit || instructions[j].intervalLength !== instructionInterval.length)) {
                if (!instructionInterval.unit) {
                  instructionInterval = {
                    length: instructions[j].intervalLength,
                    unit: instructions[j].intervalUnit
                  };
                  continue;
                }

                $scope.unequalIntervals = true;
                break;
              }
            }
          }

          $scope.showLocaleDialog = function(isModal) {
            if ($scope.isDarkMode && $scope.variables.labelDisplayModePopup === 'default') {
              $scope.labelMode = 'inline';
            }
            if (isModal) {
              var modalInstance = $modal.open({
                templateUrl: 'localeDialog.html',
                scope: $scope,
                windowClass: 'remove-transform widgetDialog locale-modal',
                controller: function ($scope, $modalInstance) {
                  $scope.$parent.modalEvent.isOpen = true;
                  $scope.localeDetails.loaded = false;
                  $scope.regions = [];

                  $scope.choose = function (country, language) {
                    $modalInstance.close({
                      'country': country,
                      'language': language
                    });
                  };

                  $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                  };

                  setCountriesList($scope.$parent.country, $scope.$parent.language, $scope.regions);
                  $scope.localeDetails.loaded = true;
                }
              });

              modalInstance.result.then(function (fields) {
                $scope.localeChange(fields.country, fields.language);
              }).finally(function () {
                $timeout(function () {
                  $scope.$parent.modalEvent.isOpen = false;
                }, 100);
              });
            }
          };
          $scope.updateAutoRenew();
          $scope.doPayment = function(form) {
            if ($scope.processing.freeze) {
              return; // don't try again.
            }

            $scope.processing.freeze = true;

            var data = {};

            data.contact = $scope.contact;
            data.contact.country = $scope.country;
            data.sepa = $scope.sepa;

            // parse mm/yy
            if ($scope.card.monthYear && $scope.card.monthYear.length == 7 && $scope.card.monthYear.indexOf(' / ') > -1 ) {
              const splits = $scope.card.monthYear.split(' / ');
              $scope.card.month = splits[0];
              $scope.card.year = splits[1];
            }

            data.card = Object.keys($scope.card)
                        .filter(key => key !== "monthYear")
                        .reduce((obj, key) => {
                            obj[key] = $scope.card[key];
                            return obj;
                        }, {});

            data.paymentKlarna = $scope.paymentKlarna;
            data.cpfNumber = $scope.cpfNumber || form.cpfNumber ? form.cpfNumber.$modelValue : "";
            data.captcha = {
              token: $scope.captcha.token,
              captchaType: $scope.captcha.captchaType
            };

            if ($scope.applepay && $scope.applepay.data && $scope.applepay.transactionIdentifier && $scope.applepay.signature && $scope.applepay.version && $scope.applepay.paymentMethod){
              data.applepay = {
                paymentData: {
                  data: $scope.applepay.data,
                  version: $scope.applepay.version,
                  signature: $scope.applepay.signature,
                  header: $scope.applepay.header
                },
                transactionIdentifier: $scope.applepay.transactionIdentifier,
                email: $scope.applepay.email,
                paymentMethod: {
                  displayName: $scope.applepay.paymentMethod.displayName,
                  network: $scope.applepay.paymentMethod.network,
                  type: $scope.applepay.paymentMethod.type
                }
              };
              data.contact.email = data.contact.email || $scope.hasAccount ? data.contact.email : $scope.applepay.email;
              data.contact.phoneNumber = $scope.applepay.phoneNumber;

              let contactAddress = $scope.applepay.billingContact;
              if ($scope.applepay.shippingContact) {
                contactAddress = angular.extend(contactAddress, $scope.applepay.shippingContact);
              }
              data.contact.firstName = contactAddress.givenName;
              data.contact.lastName = contactAddress.familyName;
              data.contact.country = contactAddress.countryCode;
              if (contactAddress.administrativeArea) {
                if (data.contact.country === 'US' || data.contact.country === 'CA') {
                  data.contact.region = contactAddress.administrativeArea;
                } else {
                  data.contact.regionCustom = contactAddress.administrativeArea;
                }
              }
              data.contact.city = contactAddress.locality;
              data.contact.postalCode = contactAddress.postalCode;
              data.contact.phoneNumber = contactAddress.phoneNumber;
              if (contactAddress.addressLines) {
                data.contact.addressLine1 = contactAddress.addressLines[0];
                data.contact.addressLine2 = contactAddress.addressLines.length > 1 ? contactAddress.addressLines[1] : undefined;
              }
            }

            if ($scope.googlepay && $scope.googlepay.token){
              data.googlepay = $scope.googlepay;
            }

            if ($scope.savedPaymentMethod) {
              data.card = {
                number: $scope.savedPaymentMethod.name,
                security: $scope.card.security,
                month: $scope.savedPaymentMethod.cardExpirationMonth,
                year: $scope.savedPaymentMethod.cardExpirationYear,
                savedCardId: $scope.savedPaymentMethod.id,
                savedCardEnding: $scope.savedPaymentMethod.cardEnding,
                savedCardBin: $scope.savedPaymentMethod.cardBin,
                variantType: $scope.savedPaymentMethod.variantType
              }
            }

            if ($scope.savedExpressPaymentMethod && form.paymentType === 'card') {
              data.card = {
                number: $scope.savedExpressPaymentMethod.name,
                security: $scope.card.security,
                month: $scope.savedExpressPaymentMethod.cardExpirationMonth,
                year: $scope.savedExpressPaymentMethod.cardExpirationYear,
                savedCardId: $scope.savedExpressPaymentMethod.id,
                savedCardEnding: $scope.savedExpressPaymentMethod.cardEnding,
                savedCardBin: $scope.savedExpressPaymentMethod.cardBin,
                variantType: $scope.savedExpressPaymentMethod.variantType
              }
            }

            data.ach = $scope.ach;
            data.mercadopago = $scope.mercadopago;
            data.paymentType = !!form.paymentType ? form.paymentType : $scope.option.type;
            data.upi = $scope.upi;

            if ($scope.option && $scope.option.requireCustomerReference) {
              data.customerReference = $scope.customerReference.id;
            }


            data.autoRenew = $scope.subscriptionCheckbox.autoRenew;

            data.subscribe = $scope.$parent && $scope.$parent.mailingList ? $scope.$parent.mailingList.subscribe : $scope.mailingList.subscribe;

            if ($scope.recipient && $scope.recipient.selected) {
              data.recipient = $scope.recipient;
              data.recipient.role = 'recipient';
              data.recipientSelected = true;
            } else {
              data.recipientSelected = false;
            }

            if($scope.option && (form['payment-option-type'] != null && form['payment-option-type'].$modelValue === 'upi' || $scope.option.type === 'upi') && $scope.mobileAppSelected) {
              data.upi.mobileAppSelected = $scope.mobileAppSelected;
              data.upi.requestMobileExperience = true;
            }

            try {
              let fp = JSON.parse(localStorage.getItem("fs_buyer_id")) || {}
              data.fingerprint = {uniqueId: fp.uniqueId, fingerprintHash: fp.fingerprintHash};
            } catch(ex){}

            $scope.GAsend(5, 'Payment Started');

            // We need to pass along the data object along with the form to the paymentSuccessHandler because the Ebanx
            // code dismisses the modal which clears the form.
            const preserveData = {
              form: form,
              data: data
            }

            // $scope.http('POST', '/payment', data, paymentSuccessHandler.bind(form), paymentErrorHandler);
            $scope.http('POST', '/payment', data, paymentSuccessHandler.bind(preserveData), paymentErrorHandler);

            function paymentErrorHandler(result) {
              $scope.processing.freeze = false;
              $scope.showPixLoadingSpinner = false;
              if (result != null && typeof result === "string" && result.indexOf("OrderPaymentInProgress") !== -1) {
                $scope.addAlert('OrderPaymentInProgress');
              } else {
                $scope.addAlert('ErrorServer');
              }
              $scope.sendResizeMessage();
              $scope.closeApplePayWindow('fail');
              $scope.closeGooglePayWindow('fail');
            };
          };

          $scope.resetErrorsAndValidations = function (){ //
            $scope.captcha.errorCode = '';
          }

          function paymentSuccessHandler(result) {
            var form = this.form;
            var data = this.data;
            fscGlobal.messageScope = $scope;
            $scope.showPixLoadingSpinner = false;
            if (result.next == 'error') {
              $scope.closeApplePayWindow('fail');
              $scope.closeGooglePayWindow('fail');

              analyze({
                '_private': true,
                'fsc-exception': {
                  'exDescription': 'Payment Error: ' + JSON.stringify(result.messages) + JSON.stringify(result.validation),
                  'exFatal': true,
                  'appName': 'Payment'
                },
                'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
              });

              $scope.getPaymentErrors(result);

              $scope.messages = result.messages;
              $scope.validations = [];
              $scope.resetErrorsAndValidations();

              /* Highlighting fields with errors on payment failed */
              if($scope.messages !== null &&  $scope.messages !== undefined) {
                $scope.messages.forEach(message => {
                  highlightAchFormControl(message.phrase)
                })
              }

              // Show AP errors
              if ($scope.applepay.transactionIdentifier && $scope.expressCheckoutButtons.length > 0){
                $scope.messages.forEach(message => {
                  $scope.messagesExpress = [{ "type": "danger","phrase": message.phrase}];
                });
              }

              $scope.processing.freeze = false;
              if (angular.isDefined(result.validation) && result.validation.length > 0) {
                $scope.validations = result.validation;
                $scope.checkCardFields();

                //make variable available in other scope
                var setSSV =  $scope._setServerSideValidations;
                console.log('setSSV ref', setSSV);
                if(setSSV) {
                    setSSV($scope.validations);
                }

                angular.forEach(result.validation, function(o, k) {
                  // Remove after backend switch
                  var oldnames = {
                    "billingPostal.postalCode": "contact.postalCode",
                    "shipping.city": "contact.city",
                    "shipping.postalCode": "contact.postalCode",
                    "shipping.region": "contact.region",
                    "shipping.street": "contact.street"
                  };
                  var field = o.field in oldnames ? oldnames[o.field] : o.field;
                  // End Remove
                  if( 'captcha' === field ){
                    $scope.captcha.errorCode = o.phrase;
                  }

                  if (field in form) { //because we currently collect zip codes 2 ways -- remove after backend switch?
                    // Server error and Screen reader challenge: Ex: for email, the UI validation is relaxed. Serverside validation is extensive (checks things like valid TLDs)
                    // So, we need a helpful message for the Screen reader user to identify the error.
                    form[field].$setValidity('remote-validation', false);
                  }
                  var element = document.getElementById(o.field + '-validation-msg');
                  if( element){
                    element.innerHTML = '<span role="alert">' + $filter('phrase')(o.phrase) + '</span>';
                  }
                });
                focusOnFirstInvalidField();
                $scope.invalid = true;
              }

              //Statement to process the response sent back by trial concurrency validation component
              if (angular.isDefined(result.trialConcurrencyResponse) && result.trialConcurrencyResponse.sessionId !== null){

                var newSessionId = result.trialConcurrencyResponse.sessionId;
                // Extract the session ID from the URL
                var oldSessionId = env.lastSessionUrl.match(/session\/([^/]+)/)[1];
                // Replace the session ID with the new string
                env.lastSessionUrl = env.lastSessionUrl.replace(oldSessionId, newSessionId);
                $scope.refreshOrderResponse(result);

                if ($scope.containsPhysicalProduct || $scope.variables.forcePhysicalAddressCollection == "true") {
                  $scope.payment.redirectedMethods = ["paypal","amazon","pix"];
                } else {
                  $scope.payment.redirectedMethods = ["paypal","amazon","pix","wire"];
                }

                // Removing PayPal from this list means enable shipping address collection at the checkout screen
                if($scope.hasSiteLevelFeatureFlag("paypal.address.collection.at.checkout")) {
                  const index = $scope.payment.redirectedMethods.indexOf("paypal");
                  if (index > -1) {
                    $scope.payment.redirectedMethods.splice(index, 1);
                  }
                }

                $scope.updateAutoRenew();

                $scope.trialConcurrencyShowCustomDivision = true;
                $rootScope.trialConcurrencyShowCustomDivision = true;
                trialHoppingCheckFound = true;

                if($scope.messages !== null &&  $scope.messages !== undefined) {
                  $scope.messages.forEach(message => {
                    if(message.phrase === 'TrialConcurrencyTrialSubsStillActive'){
                      $scope.showAmPortalButton = true;
                      $scope.trialConcurrencyAmPortalUrl = result.trialConcurrencyResponse.amPortalUrl;
                      $rootScope.showAmPortalButton = true;
                      $rootScope.trialConcurrencyAmPortalUrl = result.trialConcurrencyResponse.amPortalUrl;
                      var msg = $filter('phrase')(message.phrase);
                      var msg2 = $filter('phrase')('TrialConcurrencyThankYou');
                      $scope.arg1 = result.trialConcurrencyResponse.trialSubscriptionExpirationDate.bold();
                      var updatedMsg = msg.replace(/%s/g, $scope.arg1);
                      $scope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${updatedMsg} <br> <br> ${msg2}`);
                      $rootScope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${updatedMsg} <br> <br> ${msg2}`);
                    } else if(message.phrase === 'TrialConcurrencyTrialSubsInReactivationPeriod' || message.phrase === 'TrialConcurrencyTrialSubsOutReactivationPeriod'){
                      var msg = $filter('phrase')(message.phrase);
                      var msg2 = $filter('phrase')('TrialConcurrencyThankYou');
                      $scope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${msg} <br> <br> ${msg2}`);
                      $rootScope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${msg} <br> <br> ${msg2}`);
                    } else if(message.phrase === 'TrialConcurrencyTrialExistingActiveSubscription' || message.phrase === 'TrialConcurrencyCanceledSubscription'){
                      var msg = $filter('phrase')(message.phrase);
                      var msg2 = $filter('phrase')('TrialConcurrencyThankYouLoyalty');
                      $scope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${msg} <br> <br> ${msg2}`);
                      $rootScope.trialConcurrencyMessageCustomDivision = $sce.trustAsHtml(`${msg} <br> <br> ${msg2}`);
                    }
                  })
                }
              }

            } else if (result.next == 'redirect') {
              $scope.closeApplePayWindow('success');
              $scope.closeGooglePayWindow('success');

              $scope.replaceSessionState();

              window.removeEventListener('unload', $scope.popupClose);

              if ($scope.payment.optionType === 'paypal' || $scope.payment.optionType === 'amazon'|| $scope.payment.optionType === 'pix' ||
                  $scope.payment.optionType === 'sofort' || $scope.payment.optionType === 'tosspay' || $scope.payment.optionType === 'naverpay' ||
                  $scope.payment.optionType === 'ovo' || $scope.payment.optionType === 'promptpay') {
                top.location.href = result.url;
              } else if ($scope.payment.optionType === 'ideal' || $scope.payment.optionType === 'kakaopay' || $scope.payment.optionType === 'wechatpay' || $scope.payment.optionType === 'alipay' || $scope.payment.optionType === 'mercadopago' || $scope.payment.optionType === 'upi') {
                top.location.href = appendQueryStringToUrl(result.url, appendGAtoQueryString(location.search));
              } else {
                location.href = appendQueryStringToUrl(result.url, location.search);
              }

            } else if (result.next == 'widget') {
              env.lastSessionToken = result.session.token;
              //$scope.cancel();

              $scope.showPaymentWidgetDialog({
                'widgetTitlePhrase': $scope.option.phrase,
                'url': result.url,
                'widgetWidth': result.widgetWidth,
                'widgetHeight': result.widgetHeight
              });
            } else if (result.next === 'mobile_app') {
              $scope.replaceSessionState();
              window.removeEventListener('unload', $scope.popupClose);

              const targetUrl = appendQueryStringToUrl(result.url, appendGAtoQueryString(location.search));
              let pollInterval = null;
              const pollEndpoint = $scope.paymentServiceUrl + 'transaction-status-updates?transactionId=' + result.paymentServicePaymentTransactionId;
              const pollFrequency = 3000; // Polling every 3 seconds
              const pollDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
              let startTime = null;

              const pollTransactionStatus = () => {
                if (!startTime) {
                  startTime = Date.now();
                }

                if (Date.now() - startTime >= pollDuration) {
                  if (pollInterval) {
                    $interval.cancel(pollInterval);
                    pollInterval = null;
                    // leave for debugging
                    // console.log('Stopped polling after 10 minutes.');
                  }
                  return;
                }

                $http.get(pollEndpoint)
                    .then(function (response) {
                      if (response.data.status === 'SUCCESS') {
                        if (pollInterval) {
                          $interval.cancel(pollInterval);
                          pollInterval = null;
                        }
                        window.location.href = result.paymentSuccessUrl;
                      } else if (response.data.status === 'PENDING') {
                        // Leave for debugging
                        // console.log('polling status = ' + response.data.status);
                      }
                    }, function (error) {
                      // Silent fail; retry on next interval
                      console.error('Error polling transaction status:', error);
                    });
              };

              // Redirect to the mobile app link
              top.location.href = targetUrl;

              // Start polling when the tab becomes visible again
              document.addEventListener('visibilitychange', () => {
                if (!document.hidden && !pollInterval) {
                  pollInterval = $interval(pollTransactionStatus, pollFrequency);
                  // leave for debugging
                  // console.log('Polling started upon returning to the tab.');
                } else if (document.hidden && pollInterval) {
                  $interval.cancel(pollInterval);
                  pollInterval = null;
                  startTime = null; // Reset start time if polling is stopped due to visibility change
                  // leave for debugging
                  // console.log('Polling stopped as tab became hidden.');
                }
              });
            } else if (result.next === 'qr_code') {
              env.lastSessionToken = result.session.token;
              $scope.paymentServicePaymentTransactionId = result.paymentServicePaymentTransactionId;
              $scope.paymentSuccessUrl = result.paymentSuccessUrl;
              window.removeEventListener('unload', $scope.popupClose);

              $scope.showQrCodePaymentWidgetUpi({
                'widgetTitlePhrase': $scope.option.phrase,
                'url': result.url,
                'widgetWidth': result.widgetWidth,
                'widgetHeight': result.widgetHeight,
                'paymentServicePaymentTransactionId': result.paymentServicePaymentTransactionId,
                'paymentSuccessUrl': result.paymentSuccessUrl,
                'cpfNumber' : $scope.cpfNumber || (form.cpfNumber ? form.cpfNumber.$modelValue : ""),
                'paymentForm': form
              });
            } else if (result.next === 'popup') {
              var paymentPopup = window.open(
                  appendQueryStringToUrl(result.url, location.search),
                  "Payment Details",
                  "left=100,top=100,width=500,height=500,popup=1"
              );
              $scope.closeApplePayWindow('success');
              $scope.closeGooglePayWindow('success');

              if(paymentPopup == null){
                $scope.processing = false;
                $scope.addAlert('PopupBlocked');
                $scope.$apply();
              }


              var timer = setInterval(function() {
                if(paymentPopup.closed) {
                  $scope.processing = false;
                  clearInterval(timer);
                  $scope.addAlert('PopupClosed');
                  $scope.$apply();
                }
              }, 500);

            }else if (result.next === '3ds') {

              /* Adyen wants us to POST to the URL. Since there is no response
                 and Adyen loads the authentication page, we build and submit
                 a hidden form */

              var form = document.createElement('form');
              form.method = 'post';
              form.action = result.url3ds;
              form.target=document.getElementById('three-ds-authentication') ? "three-ds-authentication" : 'three-ds-authentication-express';
              for (var key in result.redirect3dsParameters) {
                  if (result.redirect3dsParameters.hasOwnProperty(key)) {
                      var hiddenField = document.createElement('input');
                      hiddenField.type = 'hidden';
                      hiddenField.name = key;
                      hiddenField.value = result.redirect3dsParameters[key];
                      form.appendChild(hiddenField);
                  }
              }
              document.body.appendChild(form);
              $scope.processing.freeze = true;
              $scope.processingThreeDS = true;
              form.submit();

              $scope.closeApplePayWindow('fail');
              $scope.closeGooglePayWindow('success');
            } else if (result.next === 'ebanx-3ds') {
              if (typeof EBANX === 'undefined') {
                // Load the javascript library on demand.
                // <script type="text/javascript" src="https://ebanx-js.ebanx.com/v1.106.0/dist/ebanx.js"></script>
                const scriptElement = document.createElement('script');
                scriptElement.src = 'https://ebanx-js.ebanx.com/v1.115.0/dist/ebanx.js';
                scriptElement.type = 'text/javascript';
                scriptElement.onload = () => {
                  performEbanx3DSChallenge(result, form, data);
                }
                document.body.appendChild(scriptElement);
              } else {
                performEbanx3DSChallenge(result, form, data);
              }
            } else {
              $scope.addAlert('');
              $scope.processing.freeze = false;
              $scope.closeApplePayWindow('fail');
              $scope.closeGooglePayWindow('fail');
            }
            $scope.sendResizeMessage();
          };

            $scope.hasServerSideError = function(fieldName) {
                if( !$scope.validations){
                    return false;
                }
                for( const validation of $scope.validations) {
                    if( validation.field == fieldName ){
                        return true;
                    }
                }
                return false;
            }

          $scope.cpfNumberInvalid = false;
          $scope.resetCpfValidation = function() {
            $scope.cpfNumberInvalid = false;
          };

          $scope.validationClassCpfField = function(pdfField) {
            if ($scope.cpfNumberInvalid) {
              pdfField.$invalid = true;
              $scope.triggerScreenReaderValidation(pdfField);
              return 'has-error invalid-field-icon disable-mb';
            }
            return '';
          };

          $scope.resolveZipCodeMessage = function () {
            if ($scope.country === 'IN') {
              return 'PinCode';
            }
            return 'ShippingPostalCode';
          };

          $scope.resolveZipCodeAriaMessage = function () {
            if ($scope.showZipError && ($scope.country === 'CA' || $scope.country === 'IN')) {
              return $scope.validZip();
            }
            // fallback
            return $scope.resolveZipCodeMessage();
          };



          $scope.validationClass = function(field, optFieldTwo) {
            if (!$scope.formSubmitted) return '';

            // Validations do not needed for quotes
            const skipFields = [
              'contact.phoneNumber',
              'recipient.addressLine1',
              'recipient.addressLine2',
              'recipient.city',
              'recipient.region'
            ];

            // Early return for non required fields
            const postalOrRegionFields = [
              'recipient.postalCode',
              'contact.postalCode',
              'recipient.region',
              'contact.region'
            ];

            const allowedCountriesOrTypes = ['US', 'CA'];

            if (
                postalOrRegionFields.includes(field.$name) &&
                !(allowedCountriesOrTypes.includes($scope.country) || $scope.payment?.optionType === 'upi')
            ) {
              return '';
            }

            if((field.$name === 'recipient.region' || field.$name === 'contact.region') && $scope.payment?.optionType === 'upi') {
              return '';
            }

            if ($scope.payment.optionType === 'quote' && skipFields.includes(field.$name)) {
              return '';
            }

            const errorFlags = {
              'contact.email': $scope.showEmailError,
              'card.number': $scope.showCardError,
              'card.monthYear': $scope.showExpireError,
              'card.security': $scope.showCvcError,
              'contact.postalCode': $scope.showZipError,
              'recipient.postalCode': $scope.showZipError,
              'contact.region': $scope.showRegionError,
              'cpfNumber': false
            };

            // Skip validation for fields that are text inputs unless their error flag is enabled
            const skipTextField = [
              'contact.phoneNumber',
              'recipient.phoneNumber',
              'recipient.addressLine1',
              'recipient.addressLine2',
              'recipient.city',
              'contact.firstName',
              'contact.lastName',
              'contact.addressline1',
              'contact.city',
              'contact.company'
            ];

            if(!errorFlags[field.$name] && !skipTextField.includes(field.$name)) {
              return '';
            }

            const fieldName = field.$name;
            const isInvalid = field.$invalid || (optFieldTwo && optFieldTwo.$invalid);
            const fieldValidators = {
              'contact.email': () => {
                const result = $scope.validEmail(field.$modelValue);
                return result !== undefined && result !== '';
              },
              'card.number': () => {
                const result = $scope.validCard();
                return result !== undefined && result !== '';
              },
              'card.monthYear': () => {
                const result = $scope.validExpire();
                return result !== undefined && result !== '';
              },
              'card.security': () => {
                const result = $scope.validCvc();
                return result !== undefined && result !== '';
              },
              'contact.postalCode': () => {
                const result = $scope.validZip();
                return result !== undefined && result !== '';
              },
              'recipient.postalCode': () => {
                const result = $scope.validZip();
                return result !== undefined && result !== '';
              },
              'contact.region': () => {
                const result = $scope.validRegion();
                return result !== undefined && result !== '';
              },
            };

            // Special case for region field
            if (field.name === 'contact.region' && !$scope.contact.region) {
              return 'has-error';
            }

            // Check if custom validation exists and fails
            const hasCustomValidationError =
                fieldValidators[fieldName] && fieldValidators[fieldName]();

            // Base class
            let classes = '';

            if ((isInvalid && !trialHoppingCheckFound) || hasCustomValidationError) {
              classes += 'has-error invalid-field-icon';
              if(field.$name === 'contact.company') {
                  classes += ' disable-mb';
              }
            }

            if (fieldName === 'contact.postalCode' && $scope.payment.optionType !== 'quote' && $scope.payment.optionType !== 'upi' && $scope.country !== 'US' && $scope.country !== 'CA') {
              return classes;
            }

            if ((errorFlags[fieldName] && isInvalid) || hasCustomValidationError) {
              classes += ' disable-mb';
              if (fieldName === 'contact.region') {
                classes += ' region-custom';
              }
            }

            return classes.trim();
          };


          $scope.validationClassConfirmField = function(fieldToConfirm, originalField) {
            if (fieldToConfirm.$viewValue !== originalField.$viewValue && fieldToConfirm.$dirty) {
              fieldToConfirm.$invalid = true;
              $scope.triggerScreenReaderValidation(fieldToConfirm);
              return 'has-error invalid-field-icon';
            }
            return '';
          };

          function performEbanx3DSChallenge(response, form, data) {
              try {
                const mode = $scope.isProduction ? 'production' : 'test';
                EBANX.init({
                  publicIntegrationKey: response.integrationPK,
                  country: data.contact.country.toLowerCase(),
                  mode: mode
                });
              } catch (err) {
                $scope.messages.push({phrase: "Invalid Ebanx Integration Key.", "type": "danger"});
                $scope.$apply();
                return;
              }

                // Allow the modal checkout dialog time to go away.
                // setTimeout(() => {
                  // Ebanx code
              // If this is a manual rebill, the checkout modal won't prompt for email, so get it from the backend response.
              const email = form['contact.email'] ? form['contact.email'].$modelValue : response.purchaserEmail;
            // We may want to restore this at a later date, so just commenting it out for now.
                // EBANX.deviceFingerprint.getSession().then(fingerPrint => {
              const fingerPrint = { device_id: null };            // get rid of this if the deviceFingerprint() function is called

              const orderInformation = {
                amountDetails: {
                  totalAmount: parseFloat(response.totalAmount),
                  currency: 'BRL',
                },
                billTo: {
                  country: data.contact.country,
                  email: email
                },
              };

              const _cardNumber = data.card.number ? data.card.number.replaceAll(' ', '') : '';
              // If this is a manual rebill, the checkout modal won't prompt for name, so get it from the backend response.
              const purchaserName = form['contact.firstName'] ? form['contact.firstName'].$modelValue + " " + form['contact.lastName'].$modelValue : response.purchaserName;
              const paymentInformation = {
                card: {
                  number: _cardNumber,
                  expirationMonth: data.card.month,
                  expirationYear: data.card.year,
                  holderName: data.contact.firstName + " " + data.contact.lastName,
                },
                paymentMethod: 'creditcard',
                dataOnly: false,
              };

              // id: '97370192024',
              const personalIdentification = {
                id: response.cpfNumber,
                type: 'CPF',
              };

              const options = {
                orderInformation,
                paymentInformation,
                personalIdentification,
              };

              const _cardCvv = data.card.security;
              const _cardExpiryYear = data.card.year;
              const _cardExpiryMonth = data.card.month;
              const _cpfNumber = data.cpfNumber;

              // Hide the checkout modal. Don't get cancel it because we might need to show it again.
              document.querySelectorAll('.modal-dialog').forEach(function(el) {
                el.style.display = 'none';
              });

             EBANX.threeDSecure
                  .authenticate(options)
                  .then((authenticationData) => {
                    // use the authenticationData object to fullfil your payment
                    console.log("Successful 3DS authentication = ", authenticationData);

                    const ebanxCompleteData = {
                      ptId: response.ptId,
                      cardNumber: _cardNumber,
                      cardCvv: _cardCvv,
                      cardExpiryYear: _cardExpiryYear,
                      cardExpiryMonth: _cardExpiryMonth,
                      cpfNumber: _cpfNumber,
                      deviceFingerprint: fingerPrint?.device_id,
                      threeDSEci: authenticationData.threeds_eci,
                      threeDSCryptogram: authenticationData.threeds_cryptogram,
                      threeDSXid: authenticationData.threeds_xid,
                      threeDSTrxId: authenticationData.threeds_trxid
                    };
                    // Post back to monolith in order to create/capture the payment.
                    $scope.http('POST', '/3ds/return-ebanx', ebanxCompleteData, paymentCompletionSuccessHandler.bind(data), paymentCompletionErrorHandler);

                    function paymentCompletionSuccessHandler(response) {
                      console.log(response);
                      if ('error' === response.next) {
                        document.querySelectorAll('.modal-dialog').forEach(function(el) {
                          el.style.display = '';
                        });
                        $scope.messages = response.messages;
                        $scope.$apply();
                        $scope.showSpinner = false;
                        $scope.processing.freeze = false;
                      } else {
                        $scope.replaceSessionState();
                        window.removeEventListener('unload', $scope.popupClose);
                        location.href = appendQueryStringToUrl(response.url, location.search);
                      }
                    }

                    function paymentCompletionErrorHandler(response) {
                      document.querySelectorAll('.modal-dialog').forEach(function(el) {
                        el.style.display = '';
                      });
                      $scope.messages.push({ phrase: "FailureGeneric", "type": danger});
                      $scope.$apply();
                      $scope.showSpinner = false;
                      $scope.processing.freeze = false;
                    }
                  })
                  .catch((error) => {
                    // handle any errors that can happen
                    console.error("Error during 3DS authentication: ", error);
                    document.querySelectorAll('.modal-dialog').forEach(function(el) {
                      el.style.display = '';
                    });
                    $scope.messages.push({ phrase: "FailureGeneric", "type": "danger"});
                    $scope.$apply();
                    $scope.showSpinner = false;
                    $scope.processing.freeze = false;
                  });
              // End Ebanx
              // });
          }

          $scope.validationClassEmail = function(field, optFieldTwo) {
            if (submittedEmail && (field.$invalid || (optFieldTwo != null && optFieldTwo.$invalid))) {
              return 'has-error';
            } else {
              return '';
            }
          };

          $scope.validationClassQuote = function(field, optFieldTwo) {
            return '';
          };

          $scope.validateEmail = function(emailInputField) {
            const text = emailInputField?.$viewValue?.trim();

            if (!text) {
              emailInputField.$setValidity('emailError', false);
              return;
            }

            const parts = text.split('@');
            const local = parts[0];
            const domain = parts[1];

            // Combine multiple validations
            const isValid =
                parts.length === 2 &&
                local.length > 0 &&
                domain.length > 0 &&
                !/\s/.test(text) &&
                !text.includes('..') &&
                !/[()<>\[\]:;\\,"]/.test(text) &&
                !local.startsWith('.') &&
                !local.endsWith('.') &&
                !domain.startsWith('.') &&
                !domain.endsWith('.') &&
                domain.includes('.') &&
                !domain.endsWith('.') &&
                local.length <= 64 &&
                text.length <= 255 &&
                /^[a-zA-Z]{2,}$/.test(domain.split('.').pop());

            emailInputField.$setValidity('emailError', isValid);
          };

          $scope.validateAddress = function(addressInputField) {
            if($scope.country ==='AU' && addressInputField.$viewValue.length < 6) {
              addressInputField.$setValidity('emailError', false);
            } else {
              addressInputField.$setValidity('emailError', true);
            }
          };

          $scope.loaded = true;

        }

        $rootScope.modalCtrlRef = modalCtrl;   // inject $rootScope where this is defined
      }; /* end choosePaymentOptionWithFields */

      /*==========  Coupons code for pinhole  ==========*/
      $scope.hasCoupons = function() {
        const self = this || $scope;
        $scope.couponString = self.couponString;
        return ( "couponString" in self && typeof self.couponString === "string" && self.couponString.length > 1 );
      };

      $scope.applyCoupons = function(doRemove) {
        if (doRemove) {
          $scope.removeRequestCalled = true;
        } else {
          $scope.removeRequestCalled = false;
        }
        $scope.http('POST', '/coupons', {
          coupons: doRemove ? [] : [$scope.couponString],
          postalCode: $scope.recipient && $scope.recipient.selected ? $scope.recipient.address.postalCode : $scope.contact.postalCode
        }, function(response) {
          if ($scope.removeRequestCalled) {
            $timeout(() => {
              document.getElementById('coupon-aria-message').textContent=document.getElementById('coupon-removed-message-source').textContent;
            }, 500);
          }
          $scope.preselectFirstPaymentMethod = false; // Toggle to prevent re-selection of the first payment method. (Only for payment hierarchy stores)
          $scope.refreshOrderResponse(response, true, false);
          $scope.preselectFirstPaymentMethod = true; // reset toggle to allow re-selection of the first payment method if needed.
        });
      };
      /*==========  End Coupons code for pinhole  ==========*/

      $scope.populateContact = function() {
        var paymentContact = env && env.paymentContact;
        if (paymentContact) {
          var contact = $scope.contact;
          if (paymentContact.email) {
            contact.email = paymentContact.email;
          }
          if (paymentContact.firstName) {
            contact.firstName = paymentContact.firstName;
          }
          if (paymentContact.lastName) {
            contact.lastName = paymentContact.lastName;
          }
          if (paymentContact.addressLine1) {
            contact.addressLine1 = paymentContact.addressLine1;
          }
          if (paymentContact.addressLine2) {
            contact.addressLine2 = paymentContact.addressLine2;
          }
          if (paymentContact.city) {
            contact.city = paymentContact.city;
          }
          if (paymentContact.region) {
            // We re-use contact from account contact to pre-fill information on pop-up however we save contact region with country code in front example US-CA, CA-ON
            contact.region = paymentContact.region.includes("-") ? paymentContact.region.split("-")[1] : paymentContact.region;
          }
          if (paymentContact.postalCode) {
            contact.postalCode = paymentContact.postalCode;
            contact.validPostalCode = paymentContact.validPostalCode;
            $scope.zipCodeValid = (!!$scope.savedPaymentMethod || !!$scope.savedExpressPaymentMethod) && !!contact.validPostalCode && $scope.variables.themeLayout !== 'stacked';
          }
          if (paymentContact.phoneNumber) {
            contact.phoneNumber = paymentContact.phoneNumber;
          }
          if (paymentContact.company) {
            contact.company = paymentContact.company;
          }
          if (paymentContact.country) {
            contact.country = paymentContact.country;
          }
        }
      }



      //function on checkout
      $scope.choosePaymentOption = function(closeOptionsDialog, resetMessages, initLoad) {
        $scope.updateFormSubmitted(false);
        cardMonthYearMutationObserver();
        $scope.variables.forcePhysicalAddressCollection = $scope.variables.serverRequestedForcePhysicalAddressCollection;
        if (initLoad) {
          $scope.populateContact();
        } else {
          $scope.complianceData.submitted = true;
        }

        //resetMessages param is needed only if payment method has changed. We do not pass resetMessages for the first opening
        if (resetMessages) {
          $scope.messages = [];
          $scope.messagesExpress = [];
        }

        var payment = $scope.payment;
        var optionType = payment.optionType;

        if (!initLoad) {
          displayOtherSelectedPaymentMethod(optionType);
        }

        if (optionType === 'quote') {
          $scope.selectGenerateQuote();
          return;
        }
        
        $scope.renderCaptchaWidget();
        $scope.showApplePayDeviceLink = false;

        if ('klarna' === optionType) {
          $scope.option.requireShipping = false;
          $scope.variables.forcePhoneNumberCollection = "true";
          $scope.variables.forcePhysicalAddressCollection = "true";
          $scope.countryRequiresPostalCode = true;
          if (!$scope.klarnaState) {
            $scope.initializeKlarna();
          }
        }

        if (!angular.isString(optionType)) {
          $scope.messages = [{
            type: 'danger',
            phrase: 'ErrorChoosePaymentMethod'
          }];
          return;
        }

        $scope.option = null;

        window.debug && debug('Payment options array: ', $scope.paymentOptionList);

        angular.forEach($scope.paymentOptionList, function(o, k) {
          window.debug && debug("Debugging payment options: ", o, optionType);
          if (o.type == optionType) {
            $scope.option = o;
            return false;
          }
        });
        $scope.currencyOptions = {
          base: '',
          override: ''
        };

        // moved GA to AFTER variables are set.

        if (window.s1s === false) {

          $scope.itemArr = $scope.GAaddProductsInCart();

          $scope.localAnalyze({
            'event': 'FSC-checkoutStep1',
            'fsc-url': window.location.href,
            'fsc-referrer': document.referrer,
            'fsc-currency': String($scope.order.currency),
            'fsc-eventCategory': 'Checkout',
            'fsc-eventAction': 'Payment Method Selected',
            'fsc-eventLabel': optionType,
            'fsc-paymentMethod': $scope.option ? $scope.option.type : ($scope.expressCheckoutButtons && $scope.expressCheckoutButtons.length > 0 ? $scope.expressCheckoutButtons[0] : ''),
            'ecommerce': {
              'currencyCode': String($scope.order.currency),
              'checkout': {
                'actionField': {
                  'step': 1,
                  'option': String(optionType)
                },
                'products': $scope.itemArr
              }
            }
          });

          window.s1s = true;

        }

        //when payment method is changed, run this check again
        $scope.showSubscriptionCheckboxForProducts();
        if (optionType === 'pix' || optionType === 'upi') {
          $scope.updateAutoRenew();
        }

        // GA when payment method was clicked

        if (optionType === 'paypal') {

          //for paypal we need to fake 4 steps of checkout

          $scope.GAsend(2, 'Name Entered', 'PayPal');
          $scope.GAsend(3, 'Email Entered', 'PayPal');
          $scope.GAsend(4, 'Payment Data Entered', 'PayPal');
          $scope.GAsend(6, 'Postal Code Entered', 'PayPal');

        }

        if (optionType === 'amazon') {

          //for amazon we need to fake 4 steps of checkout

          $scope.GAsend(2, 'Name Entered', 'Amazon');
          $scope.GAsend(3, 'Email Entered', 'Amazon');
          $scope.GAsend(4, 'Payment Data Entered', 'Amazon');
          $scope.GAsend(6, 'Postal Code Entered', 'Amazon');

        }

        if ($scope.applePayQRCloseTimerRef){
          window.clearTimeout($scope.applePayQRCloseTimerRef);
          $scope.applePayQRCloseTimerRef = null;
        }
        if (optionType === 'applepay'){
          $scope.enableEmbeddedApplePay = $scope.option.enableEmbeddedPopup ? $scope.option.enableEmbeddedPopup : false;

          // Show apple pay button
          if ($scope.enableEmbeddedApplePay && (isSafari || isiOSMobile)) {
            let url = $scope.session.applePayUrl;
            url += "&buttonOnly=true&compliance=" + ((!$scope.complianceData.enabled) || $scope.complianceData.checked);
            if ($scope.useDarkModeForExternalWidgets) {
              url += "&darkMode=true";
            }
            $scope.applePayEmbeddedUrl = $sce.trustAsResourceUrl(url);
          } else if ($scope.enableApplePayDeviceLink) {
            $scope.showApplePayDeviceLink = true;
            $scope.applePayQRCloseTimerRef = setTimeout(function(){
              $scope.popupClose();
            }, 30000);
          } else {
            $scope.enableEmbeddedApplePay = false;
          }
        }

        payment.requiresRedirect = $scope.paymentOptions[0].type === 'free' ? false : payment.redirectedMethods.indexOf(optionType) > -1;
        payment.isInitialPaymentOptionSelection = payment.isInitialPaymentOptionSelection == null;

        $scope.alipayConfirmation.display = $scope.option && $scope.option.type === 'alipay';

        // Then we need to show our field dialog, and collect any required info
        // ahead of actual payment choice request.
        if (!$scope.isInlineCheckout && closeOptionsDialog) {
          $scope.paymentModal.dismiss('cancel');

          if (typeof $scope.waitDialog !== 'undefined') {
            $scope.waitDialog.dismiss('cancel');
          }
        }

        if ($scope.isInlineCheckout) {
          // damn there could be more than one paymentMethodsPopover in DOM
          document.querySelectorAll('[id^="paymentMethodsPopover"]').forEach(function(el) {
            if (el && el.style.display !== 'none') {
              document.dispatchEvent(new Event('click'));
            }
          });
          if (fscGlobal.messageScope) {
            fscGlobal.messageScope.messages = [];
          }
          $timeout(function () {
            try {
              $scope.$apply();
            } catch(e) {
              // NOOP
            }
          });
        }
        $scope.choosePaymentOptionWithFields();

        $scope.paymentModalFocus(initLoad);

        $scope.payment = payment;

        if (optionType !== 'applepay') {
          $scope.closeApplePayWindow('close');
        }
        if (optionType !== 'googlepay') {
          $scope.closeGooglePayWindow('close');
        }

        $timeout(() => {
          $scope.sendResizeMessage();
        }, 0);
      }; /* end choosePaymentOption */


      // If the selected payment option was inside the "More payment options" dropdown, bring it to the list of visible options in the last position
      function displayOtherSelectedPaymentMethod(optionType) {
        if ($scope.otherPaymentOptions) {
          let isOtherPaymentOptionSelected = $scope.otherPaymentOptions.some(option => option.type === optionType)

          if (isOtherPaymentOptionSelected) {
            // For accordion view, don't swap positions - just reveal all options
            if ($scope.isAccordionView) {
              $scope.showAllPaymentMethods = true;
              $scope.otherPaymentOptionSelected = optionType;
            } else {
              // Original swapping logic for non-accordion views
              let visibleOptionToSwap = $scope.paymentOptionList[$scope.listPaymentOptions.length - 1];
              let otherOptionSelected = $scope.paymentOptionList.find(option => option.type === optionType);
              let otherOptionSelectedIndex = $scope.paymentOptionList.indexOf(otherOptionSelected);

              $scope.paymentOptionList[$scope.listPaymentOptions.length - 1] = otherOptionSelected;
              $scope.paymentOptionList[otherOptionSelectedIndex] = visibleOptionToSwap; //Move the payment option in the last visible position to the "More payment options" dropdown
              $scope.otherPaymentOptionSelected = otherOptionSelected.type;
              $scope.checkMaxPaymentOptions($scope.paymentOptionList);
            }
          }

          $scope.threeDotsSelectedWithArrowKeys = false;
          $scope.arrowKeyOtherSelectedOption = ""
        }
      }

      $scope.displayPurchaserInput = function() {
        var shouldCollectWirePhysicalAddress = $scope.option.type == 'wire' && !!$scope.variables.forcePhysicalAddressCollection;
        return $scope.option.requireContact || $scope.option.requirePhoneNumber || $scope.option.requireIban || $scope.option.requireCpfNumber || $scope.option.requireCard || $scope.option.requireCustomerReference || $scope.option.requireShipping || $scope.option.requireBillingPostal || $scope.variables.showCompanyField == 'require' || shouldCollectWirePhysicalAddress;
      };


      // When using SBL, a user can directly navigate to a payment processor's checkout if the below criteria is met.
      function allowedToDirectNavigateToPaymentProcessor() {
        let zipCodeMandatoryCountries = ['US', 'CA']
        let directNavigatePaymentMethods = ['paypal', 'amazon']
        // This method is intended for SBL only
        if(!$scope.payment.isInitialPaymentOptionSelection || !directNavigatePaymentMethods.includes($scope.payment.optionType)) {
          return false;
        }

        if($scope.option.requireContact) {
          // If email is not present, return false
          if(!$scope.contact.hasOwnProperty('email') || typeof $scope.contact['email'] !== 'string' || !$scope.contact['email'].length) {
            return false;
          }
          // If firstName is not present, return false
          if(!$scope.contact.hasOwnProperty('firstName') || typeof $scope.contact['firstName'] !== 'string' || !$scope.contact['firstName'].length) {
            return false;
          }
          // If lastName is not present, return false
          if(!$scope.contact.hasOwnProperty('lastName') || typeof $scope.contact['lastName'] !== 'string' || !$scope.contact['lastName'].length) {
            return false;
          }
        }
        // If postalCode is required and not present, return false
        if(zipCodeMandatoryCountries.includes($scope.country) && (!$scope.contact.hasOwnProperty('postalCode') || typeof $scope.contact['postalCode'] !== 'string' || !$scope.contact['postalCode'].length)) {
          return false;
        }
        return !($scope.option.requireCard || $scope.option.requireCustomerReference || $scope.option.requireShipping || $scope.variables.showCompanyField === 'require' || ($scope.complianceData.enabled && !$scope.complianceData.checked) || $scope.subscriptionCheckbox.display);

      }

      // Adds any query param to the end of a url
      function appendQueryStringToUrl(url, queryString) {
        if (queryString) {
          if (url.indexOf('?') != -1) {
            url += '&' + queryString;
          } else {
            url += '?' + queryString;
          }
        }

        return url;
      }

      $scope.alipayConfirmation = {};
      $scope.alipayConfirmed = function() {
        if (!$scope.alipayConfirmation.alipayLocation) {
          return;
        }
        top.location.href = $scope.alipayConfirmation.alipayLocation;
        $scope.processing.freeze = true;
      };

      $scope.waitForAndDo = function(f, d) {
        var e = document.getElementById(f);
        if (e !== null) {
          d();
        } else {
          setTimeout(function() {
            $scope.waitForAndDo(f, d);
          }, 50);
        }
      };

      // Wait Dialog
      $scope.showWaitDialog = function(waitTitlePhrase, waitAboutPhrase) {
        if ($scope.total) {
          $scope.total = $filter('price')($scope.total);
        }
        // setTimeout re-queues at the end of the execution queue
        setTimeout(function() {
          $scope.waitDialog = $modal.open({
            scope: $scope,
            templateUrl: 'waitDialog.html',
            backdrop: false,
            windowClass: 'dialog-small remove-transform',
            controller: function($scope, $modalInstance, $filter) {
              // $scope.messages = [];
              $scope.cancel = function() {
                $scope.popupClose();
              };
              $scope.subscriptionDetails = function() {
                $scope.isToday = subscriptions.isToday;
              };
            }
          });
        }, 0);

        $scope.SpriteSpinner = function(el, options) {
          var self = this,
            img = el.children[0];
          this.interval = options.interval || 10;
          this.diameter = options.diameter || img.width;
          this.count = 0;
          this.el = el;
          return this;
        };
        $scope.SpriteSpinner.prototype.start = function() {
          var self = this,
            count = 0,
            img = this.el.children[0];
          this.el.display = "block";
          self.loop = setInterval(function() {
            if (count == 19) {
              count = 0;
            }
            img.style.top = (-self.diameter * count) + "px";
            count++;
          }, this.interval);
        };
        $scope.SpriteSpinner.prototype.stop = function() {
          clearInterval(this.loop);
          this.el.style.display = "none";
        };

        $scope.waitForAndDo('spinner', function() {
          var s = new $scope.SpriteSpinner(document.getElementById('spinner'), {
            interval: 50,
            diameter: 72
          });
          s.start();
        });
      };

      $scope.openQrCodeWidgetUpi = function (options) {
        let widget = $modal.open({
          templateUrl: $scope.variables.themeModeJS === $scope.DARK_MODE
              ? 'qrCodeWidgetUpiDarkMode.html'
              : 'qrCodeWidgetUpi.html',
          windowClass: 'dialog-small remove-transform upi-widget-modal',
          scope: $scope,
          resolve: {
            'widgetTitlePhrase': function () {
              return options.widgetTitlePhrase;
            }
          },

          controller: function ($scope, $modalInstance, $filter, $http, $interval, $timeout, $sce) {
            $scope.widgetTitlePhrase = options.widgetTitlePhrase;
            $scope.url = $sce.trustAsResourceUrl(options.url);
            $scope.widgetWidth = options.widgetWidth;
            $scope.widgetHeight = options.widgetHeight;
            $scope.paymentServicePaymentTransactionId = options.paymentServicePaymentTransactionId;
            $scope.paymentSuccessUrl = options.paymentSuccessUrl;
            $scope.cpfNumber = options.cpfNumber;
            $scope.pollingInterval = 3000; // Polling every 3 seconds
            $scope.remainingTimeSeconds = 600; // 10 minutes
            $scope.qrValid = true; // Toggles display of QR

            // 600s -> 10:00 minutes
            function formatTime(seconds) {
              let minutes = Math.floor(seconds / 60);
              let secs = seconds % 60;
              return (minutes < 10 ? '0' : '') + minutes + ':' + (secs < 10 ? '0' : '') + secs;
            }

            $scope.formattedTime = formatTime($scope.remainingTimeSeconds);

            let timer = $interval(function () {
              if ($scope.remainingTimeSeconds > 0) {
                $scope.remainingTimeSeconds--;
                $scope.formattedTime = formatTime($scope.remainingTimeSeconds);
              } else {
                $scope.qrValid = false; // Show image instead of closing
                $interval.cancel(timer);
                $interval.cancel(pollInterval);
              }
            }, 1000);

            // • Poll {for 10 minutes, every 10 seconds} - for payment status updates.
            // • If QR payment is successful, display the complete page.
            let poll = function () {
              // Stop polling if time is up or QR is invalid
              if ($scope.remainingTimeSeconds <= 0 || !$scope.qrValid) {
                return;
              }

              $http.get($scope.paymentServiceUrl + 'transaction-status-updates?transactionId=' + $scope.paymentServicePaymentTransactionId)
                  .then(function (response) {
                    if (response.data.status === 'SUCCESS') {
                      $interval.cancel(pollInterval);
                      window.location.href = $scope.paymentSuccessUrl;
                    } else if (response.data.status === 'PENDING') {
                      // Leave this log for debugging
                      // console.log('polling status =' + response.data.status);
                    } else if (response.data.status === 'ERROR') {
                      // Do nothing, we retry in 10s
                    }
                  }, function (error) {
                    // Do nothing, we retry in 10s
                  });
            };

            let pollInterval = $interval(poll, $scope.pollingInterval);

            $scope.cancel = function () {
              $scope.qrValid = false;
              $interval.cancel(timer);
              $interval.cancel(pollInterval);
              // $scope.allowBack = true;
              $modalInstance.dismiss('cancel');
              // $scope.refreshPageResponse();
            };

            $scope.urlString = options.url;

            $scope.copyPaymentLink = function() {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText($scope.urlString).then(function() {
                  console.log('PIX code copied to clipboard');
                }).catch(function(err) {
                  console.error('Failed to copy PIX code:', err);
                });
              } else {
                // Fallback for older browsers
                let textArea = document.createElement('textarea');
                textArea.value = $scope.urlString;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                  document.execCommand('copy');
                  console.log('PIX code copied to clipboard (fallback)');
                } catch (err) {
                  console.error('Failed to copy PIX code (fallback):', err);
                }
                document.body.removeChild(textArea);
              }
            };

            let buildDataForQrCodeReq = function(form) {
              let data = {};
              data.contact = $scope.contact;
              data.contact.country = $scope.country;

              data.ach = $scope.ach;
              data.mercadopago = $scope.mercadopago;
              data.paymentType = $scope.option.type;
              data.cpfNumber = $scope.cpfNumber;
              data.upi = $scope.upi;

              if ($scope.option.requireCustomerReference) {
                data.customerReference = $scope.customerReference.id;
              }

              data.autoRenew = $scope.subscriptionCheckbox.autoRenew;

              data.subscribe = $scope.$parent && $scope.$parent.mailingList ? $scope.$parent.mailingList.subscribe : $scope.mailingList.subscribe;

              if ($scope.recipient && $scope.recipient.selected) {
                data.recipient = $scope.recipient;
                data.recipient.role = 'recipient';
                data.recipientSelected = true;
              } else {
                data.recipientSelected = false;
              }

              if(form['payment-option-type'].$modelValue === 'upi' && $scope.mobileAppSelected) {
                data.upi.mobileAppSelected = $scope.mobileAppSelected;
                data.upi.requestMobileExperience = true;
              }

              return data;
            }

            $scope.doQrCodePaymentRefresh = function(form) {
              let data = buildDataForQrCodeReq(form);

              return new Promise(function(resolve, reject) {
                $scope.http('POST', '/payment', data, function(result) {
                  if (result.next === 'qr_code') {
                    resolve({
                      url: result.url,
                      paymentServicePaymentTransactionId: result.paymentServicePaymentTransactionId,
                      paymentSuccessUrl: result.paymentSuccessUrl
                    });
                  } else {
                    reject(false);
                    $scope.addAlert('ErrorServer');
                    $scope.sendResizeMessage();
                    $scope.cancel();
                  }
                }, function(error) {
                  reject(error);
                  $scope.addAlert('ErrorServer');
                  $scope.sendResizeMessage();
                  $scope.cancel();
                });
              });
            };

            $scope.regenerateQrCode = function() {
              $scope.doQrCodePaymentRefresh(options.paymentForm).then(function(response) {
                // Success: URL and transaction ID received
                if (response && response.url) {
                  $scope.remainingTimeSeconds = 600; // Reset to 10 minutes
                  $scope.formattedTime = formatTime($scope.remainingTimeSeconds);

                  $scope.qrValid = true;
                  $scope.url = $sce.trustAsResourceUrl(response.url);
                  $scope.paymentServicePaymentTransactionId = response.paymentServicePaymentTransactionId;
                  $scope.paymentSuccessUrl = response.paymentSuccessUrl;

                  // Restart timer
                  timer = $interval(function() {
                    if ($scope.remainingTimeSeconds > 0) {
                      $scope.remainingTimeSeconds--;
                      $scope.formattedTime = formatTime($scope.remainingTimeSeconds);
                    } else {
                      $scope.qrValid = false;
                      $interval.cancel(timer);
                      $interval.cancel(pollInterval);
                    }
                  }, 1000);

                  // Restart polling
                  pollInterval = $interval(poll, $scope.pollingInterval);
                }
              }).catch(function(error) {
                // Error: Handle the error
                console.error("Payment error:", error);
              });
            };
          }
        });

        widget.result.finally(function() {
          $scope.processing.freeze = false;
        });

        return widget;
      };

      // QR Code Payment Widget Dialog
      $scope.showQrCodePaymentWidgetUpi = function(options) {
        if (typeof options.widgetTitlePhrase == "undefined" || options.widgetTitlePhrase.length == 0) options.widgetTitlePhrase = $filter('phrase')('PaymentInformation');
        let upiWidget = $scope.openQrCodeWidgetUpi(options);
        upiWidget.opened.then(function() {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              $scope.includeUpiQrCodeWidgetHeight = true;
              $scope.sendResizeMessage();
            });
          });
        });

      };

      $scope.openWidget = function(options) {
        var widget = $modal.open({
          templateUrl: 'widgetDialog.html',
          scope: $scope,
          windowClass: 'widgetDialog remove-transform' + ' ' + options.windowClass,
          resolve: {
            'widgetTitlePhrase': function() {
              return options.widgetTitlePhrase;
            }
          },
          controller: function($scope, $modalInstance) {
            $scope.widgetTitlePhrase = options.widgetTitlePhrase;
            $scope.url = $sce.trustAsResourceUrl(options.url);
            $scope.widgetWidth = options.widgetWidth;
            $scope.widgetHeight = options.widgetHeight;

            $scope.cancel = function() {
              $modalInstance.dismiss('cancel');
            };

            $scope.$on('close_widget_dialog', function(e) {
              $scope.cancel();
            });
          }
        });

        widget.result.finally(function() {
          $scope.processing.freeze = false;
        });

        return widget;
      };

      // Payment Widget Dialog
      $scope.showPaymentWidgetDialog = function(options) {
        if (typeof options.widgetTitlePhrase == "undefined" || options.widgetTitlePhrase.length === 0) options.widgetTitlePhrase = $filter('phrase')('PaymentDetails');
        $scope.openWidget(options);
      };

      /********************/
      //function to opean a new window for AM Portal when finding trial concurrency
      $scope.trialConcurrencyRedirect = function() {
        // Open a new page
        window.open($rootScope.trialConcurrencyAmPortalUrl, '_blank');
      };
      /********************/

      /*==========  Init  ==========*/

      $scope.subscriptionCheckbox = {};
      $scope.mailingList = {};
      $scope.modalEvent = {};
      $scope.complianceData = {};
      $scope.sepaData = {};
      $scope.applepay = {};
      $scope.complianceData.agreementCountries = ['AT', 'BE', 'BG', 'HR', 'CH', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IT', 'IE', 'JP', 'LV', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'ES', 'SI', 'SK', 'SE', 'GB'];

      $scope.refreshPageResponse(initData, false);

      angular.element(document.getElementById('app')).removeClass('updating').addClass('loaded');
      $scope.resize = function() {
        var images = angular.element(document.getElementsByClassName("logo-retina"));
        angular.forEach(images, function(img) {
          img.width = img.width * 0.5;
          img.style.display = "block";
        });
      };

      // timeout 0 is used to wait for the scope variables
      $timeout(function() {
        //Customer email checkbox
        if ($scope.variables.collectingEmailCheckbox == 'false' || $scope.complianceData.agreementCountries.indexOf($scope.country) > -1) {
         $scope.mailingList.subscribe = false;
        } else $scope.mailingList.subscribe = true;

        $scope.subscriptionCheckbox.autoRenew = $scope.hasRecurring && initData.autoRenewInit;
        if ($scope.hasRecurring && (initData.paymentOptions.length !== 1 || initData.paymentOptions[0].type !== 'free')) {
          $scope.subscriptionCheckbox.display = !$scope.forceFuture && initData.autoRenewToggle;
        } else {
          $scope.subscriptionCheckbox.display = false;
        }

        $scope.setPaymentOptions();
        $scope.updateAutoRenew();

        $scope.referer = initData.referer;
        if ($scope.referer === '') {
          $scope.referer = 'Domain';
        } else if (!$scope.referer) {
          $scope.referer = false;
        }
        if ($scope.variables.allowSessionCurrencyOverride === 'true') {
          // Currency override options for Custom Cart checkouts
          $scope.baseCurrency = $scope.variables.baseCurrency; // what the seller selected
          $scope.localeCurrency = $scope.variables.localeCurrency; // where buyer is located
          // this can be array if gt 1 alternates
          $scope.altCurrency = $scope.variables.altCurrency; // alternate currency (or currencies) for buyer
        }
      }, 0);

      // for related offers selections count
      $scope.relatedSelections = [];

      $scope.defineMetadata = function() {

        window.theme = 'Pinhole';
        window.style = 'Flat';
        window.live = $scope.session.live;

        try {
          if ($scope.session.primary.length > 0) {
            window.vendor = $scope.session.primary;
          }
        } catch (e) {
          window.vendor = '';
        }

        try {
          if ($scope.session.secondary.length > 0) {
            window.storefront = $scope.session.secondary;
          }
        } catch (e) {
          window.storefront = '';
        }

        if ($scope.page == 'product') { // this dimesions only makes sense when we are on a product page
          window.currentProduct = $scope.groups[0].items[0].path; //current product
        }
      };

      $scope.countRelatedItems = function() {
        var repeater = true,
          promoArr = [],
          FSpromoArr = [],
          elem = $scope.groups,
          addQuantity = 0,
          replaceQuantity = 0;

        $scope.iterateOver = function(repeat, elem) {
          var promoObject = {},
            FSpromoObject = {},
            itemType = {};

          elem.forEach(function(group) {
            //check type and
            if (group.type && group.type.length > 0) {
              itemType = group.type;
            }
            angular.forEach(group.items, function(item, key) {
              // Next only for addition and replacement
              if (itemType && (itemType == 'add' || itemType == 'replace')) {
                if (itemType == 'add') {
                  addQuantity += 1;
                }
                if (itemType == 'replace') {
                  replaceQuantity += 1;
                }

                if (item.selected != true && item.position != "hidden") {

                  promoObject = {
                    'id': item.path,
                    'name': item.display,
                    'creative': $scope.offerTypeMap[itemType].name, //'Up-Sell' или 'Cross-Sell',
                    'position': item.position //(below, above
                  }

                  FSpromoObject = {
                    'id': item.path,
                    'name': $scope.offerTypeMap[itemType].name + ' Offer',
                    'creative': $scope.offerTypeMap[itemType].name, //'Up-Sell' или 'Cross-Sell',
                    'position': item.position //(below, above
                  }

                  promoArr.push(promoObject);
                  FSpromoArr.push(FSpromoObject);

                }
              }

              if (!!item.groups && item.groups.length > 0) {
                $scope.iterateOver(repeat, item.groups);
              } else {
                repeat = false;
                return;
              }
            });
          });
        };
        $scope.iterateOver(repeater, elem);
      };

      $scope.isInlineCheckout = ($scope.session && $scope.session.secondary && $scope.session.secondary.indexOf('embedded') !== -1);
      $scope.DARK_MODE = 'dark';
      $scope.LIGHT_MODE = 'light';

      /* inline & accordion */
      $scope.INLINE_VIEW = 'inline';
      $scope.STACKED_VIEW = 'stacked';
      $scope.isAccordionView = $scope.variables.themeLayout === $scope.STACKED_VIEW;
      $scope.isDarkMode = $scope.variables.themeModeJS === $scope.DARK_MODE;
      $scope.isLightMode = $scope.variables.themeModeJS === $scope.LIGHT_MODE;
      $scope.useDarkModeForExternalWidgets = $scope.variables.themeModeJS === $scope.DARK_MODE || hasDarkBG($scope.variables.bgColor);
      $scope.isPaymentMethodButtonLogoWithLabel = $scope.variables.paymentMethodStyleJS === 'logoWithLabel';
      $scope.isPaymentMethodButtonLogoOnly = $scope.variables.paymentMethodStyleJS === 'logoOnly';

      $scope.getPaymentMethodInclude = function() {
        let template;

        if ($scope.isInlineCheckout) {
          if ($scope.isPaymentMethodButtonLogoWithLabel) {
            template = 'paymentMethodsDarkMode.html';
          } else {
            template = 'paymentMethods.html';
          }
        } else {
          if ($scope.isDarkMode) {
            template = 'paymentMethodsDarkMode.html';
          } else {
            template = 'paymentMethodsLegacy.html';
          }
        }
        return template;
      };

      function hasDarkBG(c) {
        if( c){
            var colorComponents = c.replace(/[^\d,]/g, '').split(',');
            for (var i = 0; i < colorComponents.length; i++) {
                if (colorComponents[i] > 128) {
                    return false;
                }
            }
            return true;
        }
        return false;
      }

      function getContrastYIQ(hexcolor) {
        if (typeof hexcolor !== "undefined") {
          hexcolor = hexcolor.replace(/[^\d,]/g, '').split(',');
          var yiq = ((hexcolor[0] * 299) + (hexcolor[1] * 587) + (hexcolor[2] * 114)) / 1000;
          return (yiq >= 128) ? 'dark' : 'light';
        } else {
          return 'dark';
        }
      }

      /**
       * @author Julian Navarro <jnavarro@fastspring.com>
       * @team plutus team
       * this function is for handling nacha checkbox for ach
       */
      $scope.achNacha = false;
       $scope.achNachaOnChange = function() {
        $scope.achNacha = !$scope.achNacha;
        if($scope.achNacha) {
          angular.element(document.querySelector("#achNachaCheckBox")).removeClass("alert-danger");
          angular.element(document.querySelector("#achNachaCheckBox")).addClass("alert-none");
        }
      }

      function triggerAngularDigest() {
        try {
          $scope.$apply();
        } catch (e) {
          // NOOP
        }
      }

      if ($scope.isInlineCheckout) {
        // sync SBL updates to inline checkout
        window.onmessage = function(message) {
          // handle parent browser back button - returning from payment processor with user initiated back navigation
          if (message.data && message.data.clearFreezeOnHistoryTraversal) {
            if ($scope.processing && $scope.processing.freeze) {
              $scope.processing.freeze = false;
              triggerAngularDigest();
            }
          }
          var popupContainer = document.querySelector('.modal.inline-checkout-modal');
          if (message.data && message.data.refreshUI) {
            if ($scope.showEmptyCartPage) {
              $scope.showEmptyCartPage = false;
              triggerAngularDigest();
              document.location.href = document.location.href;
            } else {
              $http.get(document.location.href)
              .success(function(fileContent) {
                  if (popupContainer) {
                    popupContainer.style.visibility = 'visible';
                  }
                  var parser = new DOMParser();
                  var htmlDoc = parser.parseFromString(fileContent, 'text/html');
                  $scope.refreshPageResponse(JSON.parse(htmlDoc.getElementById('viewdata').innerText), false);
              });
            }
          } else if (message.data && message.data.emptySession) {
            // Handle empty popup.
            // delete the last item
            if ($scope.inOrder && $scope.inOrder.length === 1) {
              if ($scope.inOrder[0].path) {
                $scope.modifyItems(0, $scope.inOrder[0].path);
              }
              if (popupContainer) {
                popupContainer.style.visibility = 'hidden';
              }
              var emptyCartContainer = document.getElementById('inline-checkout-empty-container');
              if (emptyCartContainer && $scope.realContainerHeight) {
                emptyCartContainer.style.height= $scope.realContainerHeight + 'px';
              }
              $scope.showEmptyCartPage = true;
            }
          }
        };
      }

      $scope.itemLevelQuotable = () => {
        if (!$scope.groups || !$scope.groups.length) {
          return true;
        }

        try {
          const allItems = $scope.groups.concat($scope.addonsProducts());

          for (let i = 0; i < allItems.length; i++) {
            const items = allItems[i].items;
            for (let j = 0; j < items.length; j++) {
              if (items[j].selected && !items[j].quotable) {
                return false;
              }
            }
          }

          return true;
        } catch (error) {
          console.error("Error in itemLevelQuotable:", error);
          return true;
        }
      }

      $scope.addonsProducts = () => {
        let addOns = [];

        $scope.groups.forEach(group => {
          group.items.forEach(item => {
            item.groups.forEach(group => {
              if (group.type === "addon-one" || group.type === "addon-many") {
                addOns.push(group);
              }
            });
          });
        });

        return addOns;
      };

      $scope.formatCreditCardExpiry = () => {
        const monthYearInput = document.getElementById('card-expire-month-year');
        const INVALID = 'Invalid';
        const INCOMPLETE = 'Incomplete';

        if (monthYearInput) {
          monthYearInput.addEventListener("input", function (e) {
              let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
              let formattedValue = "";

              if (value.length === 1) {
                  let num = parseInt(value);
                  if (num > 1) {
                      formattedValue = "0" + num + " / ";
                  } else {
                      formattedValue = value;
                  }
              } else if (value.length === 2) {
                  let month = parseInt(value);
                  if (month >= 1 && month <= 12) {
                      formattedValue = value + " / ";
                  } else if (month >= 13 && month <= 19) {
                      formattedValue = "01 / " + value.charAt(1); // Convert 13-19 to "01/X"
                  } else {
                      formattedValue = "01 / "; // Default to "01 / " for invalid months
                  }
              } else if (value.length > 2) {
                  formattedValue = value.substring(0, 2) + " / " + value.substring(2, 4);
              }

              e.target.value = formattedValue;

              if (formattedValue.length === 7) { // Ensure full date is entered before validation
                  validateDate(true);
              } else {
                  clearErrorMessage();
              }
          });

          monthYearInput.addEventListener("keydown", function (e) {
              let cursorPos = e.target.selectionStart;
              let value = e.target.value;

              if (e.key === "Backspace") {
                  if (cursorPos === 5 && value.charAt(3) === "/") {
                      e.target.value = value.slice(0, 2);
                      e.target.setSelectionRange(2, 2);
                      e.preventDefault();
                  } else if (cursorPos === 3 && value.charAt(3) === "/") {
                      e.target.value = value.slice(0, 1);
                      e.target.setSelectionRange(1, 1);
                      e.preventDefault();
                  }
              }
          });

          monthYearInput.addEventListener("blur", function () {
                  $timeout(() => {
                      validateDate(true);
                  }, 0);
          });
        }

        function validateDate(showError) {
          const value = monthYearInput.value.replace(/\s/g, ""); // Remove spaces before splitting
          const parts = value.split("/");

          if (parts.length !== 2 || parts[1].length !== 2) {
            if (showError) {
              showErrorMessage(INCOMPLETE);
            }
            return;
          }

          let month = parseInt(parts[0]);
          let year = parseInt(parts[1]);
          let isValid = month >= 1 && month <= 12 && !isNaN(year);

          if (!isValid) {
            if (showError) {
              showErrorMessage(INCOMPLETE);
            }
            return;
          }

          // Check if date is in the past
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear() % 100; // Last two digits of year
          const currentMonth = currentDate.getMonth() + 1;

          if (year < currentYear || (year === currentYear && month < currentMonth)) {
            if (showError) {
              showErrorMessage(INVALID);
            }
            return;
          }

          clearErrorMessage();
        }

        function showErrorMessage(type) {
          const isInvalid = type === INVALID;
          const errorMessageInvalidDiv = document.getElementById('month-year-error-message-invalid');
          const errorMessageIncompleteDiv = document.getElementById('month-year-error-message-incomplete');

          if (errorMessageInvalidDiv) {
            errorMessageInvalidDiv.style.display = isInvalid ? 'block' : 'none';
            errorMessageInvalidDiv.innerHTML += " ";
          }
          if (errorMessageIncompleteDiv) {
            errorMessageIncompleteDiv.style.display = isInvalid ? 'none' : 'block';
            errorMessageIncompleteDiv.innerHTML += " ";
          }

          $scope.sendResizeMessage();
        }

        function clearErrorMessage() {
          const errorMessageInvalidDiv = document.getElementById('month-year-error-message-invalid');
          const errorMessageIncompleteDiv = document.getElementById('month-year-error-message-incomplete');

          if (errorMessageInvalidDiv) {
            errorMessageInvalidDiv.style.display = 'none';
          }
          if (errorMessageIncompleteDiv) {
            errorMessageIncompleteDiv.style.display = 'none';
          }

          $scope.sendResizeMessage();
        }
        clearErrorMessage();
      };

      function cardMonthYearMutationObserver() {
        try {
          let attempts = 0;
          const maxAttempts = 5000;
          const intervalTime = 100;
          const mmYyElementInterval = setInterval(() => {
            const monthYearInput = document.getElementById('card-expire-month-year');
            if (monthYearInput || ++attempts >= maxAttempts) {
              clearInterval(mmYyElementInterval);
              $scope.formatCreditCardExpiry();
            }
          }, intervalTime);
        } catch (e) {
          console.error("Error in element detection:", e);
        }
      }
      cardMonthYearMutationObserver();

      function makeDraggable(selector, handleSelector = '.drag-handle') {
        const el = document.querySelector(selector);
        if (!el) return;
        const handle = el.querySelector(handleSelector);
        let offsetX, offsetY;
        function startDrag(e) {
          offsetX = e.clientX - el.offsetLeft;
          offsetY = e.clientY - el.offsetTop;
          function onMouseMove(ev) {
            el.style.position = 'absolute';
            el.style.left = (ev.clientX - offsetX) + 'px';
            el.style.top = (ev.clientY - offsetY) + 'px';
          }
          function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          }
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }
        el.addEventListener('mousedown', startDrag);
        if (handle) {
          handle.addEventListener('mousedown', startDrag);
        }
      }

      window.addEventListener('unload', $scope.popupClose, false);


      window.addEventListener('load', function() {
        $scope.resize();
        $scope.defineMetadata();
        if($scope.isCartSelected && $scope.variables.responsiveCart == 'true') {
            $scope.populateContact();
            $scope.openResponsiveCart();
        } else {
          $scope.choosePaymentOption(null, null, true);
        }
        $rootScope.closeButton = getContrastYIQ($scope.variables.headerBgColor);
        if(initData.country === 'US' || initData.country === 'CA' || initData.country === 'AU' ) {
          getRegions(initData.country).then(function(response) {
            $scope.regionList[initData.country] = response;
            isRegionInList($scope.contact.country, $scope.contact);
            if ($scope.recipient) {
              isRegionInList($scope.country, $scope.recipient);
            }
          }, function() {
            $scope.regionList[initData.country] = undefined;
          });
        }
        if (window.opener) {
          document.body.style.background = 'linear-gradient(rgba(0, 0, 0, 0.901961), rgba(0, 0, 0, 0.8))';
        }

        // pre-select applePay
        if (!$scope.variables.paymentMethodOrder) {
          $scope.preSelectApplePay();
        }

        $timeout(function () {
          initSandbox($scope.session.sandbox + window.location.pathname);
          // Sift Tracking
          $scope.addSiftSnippet();
          $scope.renderCaptchaWidget();
        }, 0);
        loadSentry();
        makeDraggable('.draggable');
      }, false);
      window.addEventListener('DOMContentLoaded', function() {
        try {
          // DOMContentLoaded event fires on the window. For element inside iframe, we have a loop with exit strategy
          // window.frames['fsc-popup-frame] is not accessible due to cross domain

          // screen reader related interval, lower frequency
          var elementLoadedCounter = 1;
          var focusElementInterval = setInterval(() => {
            elementLoadedCounter++;
            var totalLabelElement = document.getElementById('total-label');
            if (totalLabelElement) {
              clearInterval(focusElementInterval);
              // make screen reader to read cart total price information
              $timeout(function() {
                var firstSpan = document.querySelector('#total-label span');
                var totalLabelScreenReaderElement = document.getElementById('total-label-sr-msg');
                if (firstSpan && totalLabelScreenReaderElement) {
                  totalLabelScreenReaderElement.innerHTML = firstSpan.innerHTML;
                }
              }, 2000); // hard coded timeout is for screen reader.
            } else if (elementLoadedCounter > 40) {
              clearInterval(focusElementInterval);
            }
          }, 100);

          // resize host container interval, higher frequency
          if ($scope.isInlineCheckout) {
            var popupContainerLoadedCounter = 1;
            var resizeContainerInterval = setInterval(() => {
              popupContainerLoadedCounter++;
              var popupContainerElement = $scope.isAccordionView ? document.querySelector('#app') : document.querySelector('.inline-checkout-modal .modal-dialog');
              if (popupContainerElement) {
                clearInterval(resizeContainerInterval);
                $scope.sendResizeMessage();
                $scope.checkMaxPaymentOptions($scope.paymentOptionList);
              } else if (popupContainerLoadedCounter > 250) {
                clearInterval(resizeContainerInterval);
              }
            }, 20);
          }
        } catch(e) {
          if (focusElementInterval) {
            clearInterval(focusElementInterval);
          }
          if (resizeContainerInterval) {
            clearInterval(resizeContainerInterval);
          }
          $scope.setInitialFocus();
        }
        cardMonthYearMutationObserver();

      }, false);

    }
  ]);

  angular.module('app')
  .controller('ModalCtrlInlineAdapter', function ($scope, $controller) {
    $scope._wired = false;

    var dummy = {
      close: angular.noop, dismiss: angular.noop,
      opened:{then:angular.noop}, rendered:{then:angular.noop},
      result:{then:angular.noop, catch:angular.noop, finally:angular.noop}
    };

    function wire(fn){
      if (!angular.isFunction(fn) || $scope._wired) return;

      $scope.payment = $scope.payment || {};
      if (!$scope.payment.optionType) $scope.payment.optionType = '';
      if (typeof $scope.popupClose !== 'function') $scope.popupClose = angular.noop;

      // run your existing (nested) modalCtrl via function ref
      $controller(fn, {
        $scope: $scope,
        $modalInstance: dummy,
        $uibModalInstance: dummy
      });

      $scope._wired = true; // <-- now safe to render the include
    }

    // try immediately
    wire($scope.modalCtrlRef || $scope.$root.modalCtrlRef);

    // or wait until parent exposes modalCtrlRef
    if (!$scope._wired) {
      var unwatch = $scope.$watch(
        () => $scope.modalCtrlRef || $scope.$root.modalCtrlRef,
        fn => { if (fn) { wire(fn); unwatch && unwatch(); } }
      );
      $scope.$on('$destroy', () => { unwatch && unwatch(); });
    }
  });

})(); //IIFE
} catch (error) {
  if (window.Sentry) {
    Sentry.captureException(error);
  } else {
    fsOnErrorHandler(error);
    loadSentry();
  }
}


// currently inlining on purpose, for better performance.
function loadSentry() {
  try {
    if (!window.Sentry) {
      function loadScript(src, attributes = {}, callback) {
        try {
          let script = document.createElement("script");
          script.src = src;
          script.defer = true;
          Object.entries(attributes).forEach(([key, value]) => script.setAttribute(key, value));
          if (callback) {
              script.onload = callback; // Execute callback after script is fully loaded
          }
          document.body.appendChild(script);
        } catch (err) {
          console.error("Error loading Sentry:", err);
        }
      }
      function captureFullPagePerformance() {
        try {
          const span = Sentry.startInactiveSpan({ name: "pageload", op: "navigation" });
          const perfEntries = performance.getEntriesByType("navigation")[0];
          if (perfEntries) {
              span.setAttribute("fetchStart", perfEntries.fetchStart);
              span.setAttribute("responseEnd", perfEntries.responseEnd);
              span.setAttribute("domInteractive", perfEntries.domInteractive);
              span.setAttribute("domContentLoaded", perfEntries.domContentLoadedEventEnd);
              span.setAttribute("loadEventEnd", perfEntries.loadEventEnd);
          }
          const resources = performance.getEntriesByType("resource");
          resources.forEach((resource) => {
              span.setAttribute(`resource_${resource.name}`, resource.duration);
          });

          function captureWebVitals() {
              if (performance && performance.getEntriesByType) {
                  // Largest Contentful Paint (LCP)
                  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
                  if (lcpEntries.length) {
                      span.setAttribute("LCP", lcpEntries[lcpEntries.length - 1].startTime);
                  }
                  // Cumulative Layout Shift (CLS)
                  let clsValue = 0;
                  const clsEntries = performance.getEntriesByType("layout-shift");
                  clsEntries.forEach((entry) => {
                      if (!entry.hadRecentInput) {
                          clsValue += entry.value;
                      }
                  });
                  span.setAttribute("CLS", clsValue);
              }
          }
          captureWebVitals();
          setTimeout(() => {
              span.end(); // Sends the performance manually, since we are loading Sentry later
          }, 0);
        } catch (err) {
          console.error("Error inside captureFullPagePerformance:", err);
        }
      }

      loadScript("https://browser.sentry-cdn.com/8.52.1/bundle.tracing.min.js", { // TODO: move to dynamo config
          crossorigin: "anonymous",
          id: "fsSentryScript"
        },
        // call back to initialize Sentry and flush any errors in the buffer.
        function () {
          try {
              let sentryDSN = document.querySelector("#fsSentryScriptDSN").value;
              if (sentryDSN.trim().length > 0) {
                  function flushErrorsToSentry() {
                    try {
                      fsErrorBuffer.forEach(({ errorObject }) => {
                          Sentry.captureException(errorObject);
                      });
                      fsErrorBuffer = [];
                    } catch (err) {
                      console.error("Error inside flushErrorsToSentry:", err);
                    }
                  }
                  Sentry.init({
                      dsn: sentryDSN,
                      integrations: [Sentry.browserTracingIntegration()], // add perfromance tracing
                      // tracesSampleRate controls how much of your application's performance data (tracing events) is captured and sent to Sentry
                      // Higher values = More data = More insights but higher storage & performance cost.
                      tracesSampleRate: 0.01, // Adjust this value for production (e.g., 0.1 for 10%)
                      beforeSend(event) {
                        if (event.exception && event.exception.values && Array.isArray(event.exception.values)) {
                            event.exception.values.forEach((exception) => {
                                if (exception.stacktrace && exception.stacktrace.frames && Array.isArray(exception.stacktrace.frames)) {
                                    exception.stacktrace.frames.forEach((frame) => {
                                        frame.vars = {}; // Remove local variable captures
                                    });
                                }
                            });
                        }
                        // Remove data from from event (prevents any sensitive data reaching sentry)
                        if (event.request && event.request.data) {
                            event.request.data = "[Filtered]";
                        }
                        return event;
                    }
                  });
                  // Flush stored errors
                  flushErrorsToSentry();
                  captureFullPagePerformance();
                  window.removeEventListener("error", fsOnErrorHandler);
                  window.removeEventListener("unhandledrejection", fsOnUnhandledRejectionHandler);
                  try {
                    // Manually capture a page load transaction
                    if (Sentry && Sentry.startTransaction) {
                      const transaction = Sentry.startTransaction({ name: "page-load" });
                      transaction.finish();
                    }
                  } catch (err) {
                    console.error(err);
                  }
              }
              if (Sentry) {
                  window.addEventListener("securitypolicyviolation", (event) => {
                      Sentry.captureMessage(`CSP Violation: Blocked URI - ${event.blockedURI}`, "warning");
                  });
              }
          } catch (err) {
              console.error(err);
          }
        }
      );
    }
  } catch (err) {
    console.error(err);
  }
}


window.onloadTurnstileCallback = function () {
  var urlObject = new URL(window.location.href);
  var params = new URLSearchParams(urlObject.search);
  debug("URL:", window.location.href, params);
  var lang = params.get("lang");
  if (lang) {
    //todo: write mapping of not supported languages to english
    //https://developers.cloudflare.com/turnstile/reference/supported-languages/
  } else {
    lang = 'en'
  }
  var theme = params.get("theme");
  if (!theme) {
    theme = 'auto'
  } else {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'auto') {
      console.warn(theme, "not supported, defaulting to auto");
      theme = 'auto'
    }
  }

  debug("lang", lang, 'theme', theme);

}

window.turnstileErrorCallback = function (error) {
    console.warn("Turnstile Error:", error);
    return 'no';
}

window.turnstileCallback = function (token) {
  debug('Challenge Success', token);
  try {
    window.postMessage({type: TURNSTILE_TOKEN, data: token}, "*");
  } catch (e) {
    console.error("problem communicating with parent", e);
  }
}


