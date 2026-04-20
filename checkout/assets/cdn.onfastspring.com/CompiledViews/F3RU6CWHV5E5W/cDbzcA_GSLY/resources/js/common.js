//////////////////////////////////////////////////////
// Place for shared elements
//////////////////////////////////////////////////////
try {
(function() {
  /**
   * TNP-2325 - Add terms of service and privacy policy links to both themes
   */
  angular.module('app').directive('termsOfService', function(env) {
    return {
      restrict: 'AC',
      scope: false,
      link: function postLink(scope, iElement, iAttrs) {
        var TERMS_OF_SALE_US = 'https://www.fastspring.com/terms-sale-us.html?utm_source=Store&utm_medium=Terms_of_Sale_US&utm_content=Pinhole&utm_campaign=Store_Traffic';
        var TERMS_OF_SALE_EU = 'https://www.fastspring.com/terms-sale-eu.html?utm_source=Store&utm_medium=Terms_of_Sale_EU&utm_content=Pinhole&utm_campaign=Store_Traffic';
        var PRIVACY_POLICY = 'https://fastspring.com/privacy?utm_source=Store&utm_medium=Privacy_Policy&utm_content=Pinhole&utm_campaign=Store_Traffic';

        var euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];

        var policies = {
          DE: {terms: 'https://fastspring.com/fastspring-terms-sale-germany/?', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-germany/?'},
          JP: {terms: 'https://fastspring.com/terms-use/terms-sale-japan/?', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-japan/?'},
          FR: {terms: 'https://fastspring.com/terms-use/fastspring-terms-sale-france/?', privacy: 'https://fastspring.com/privacy/fastspring-privacy-policy-france/?'}
        };

        scope.$watchCollection(function() { return [scope.country, scope.language] }, function(newValue, oldValue) {
          if (policies[scope.country] && policies[scope.country].terms) {
            scope.complianceData.termsURL = policies[scope.country].terms;
          } else {
            scope.complianceData.termsURL = euCountries.indexOf(scope.country) > -1 ? TERMS_OF_SALE_EU : TERMS_OF_SALE_US;
          }

          if (policies[scope.country] && policies[scope.country].privacy) {
            scope.complianceData.privacyURL = policies[scope.country].privacy;
          } else {
            scope.complianceData.privacyURL = PRIVACY_POLICY;
          }

          if (scope.complianceData.enabled) {
            scope.complianceData.template = env.phrases['AgreementTermsAndPolicy'];
            scope.complianceData.templateInApp = env.phrases['AgreementTermsAndPolicyInApp'];
          }

          scope.sepaData.template = env.phrases['SepaPaymentConfirmationMessage'];
          scope.sepaData.checkoutTemplate = env.phrases['SepaCheckoutMessage'];
        });

      },
      templateUrl:'terms-of-service.html',
    }
  });

  angular.module('app').directive('compile', function($compile) {
    return function(scope, elem, attr) {
      scope.$watch(function(scope) {
        return scope.$eval(attr.compile);
      }, function(val) {
        elem.html(val);
        $compile(elem.contents())(scope);
      });
    }
  });


  angular.module('app').filter('lastFour', ['$filter', function($filter) {
    return function(accountNum) {
      return '*'+accountNum.slice(-4);
    };
  }]);

  angular.module('app').filter('titleCase', ['$filter', function($filter) {
    return function(str) {
      str = str.toLowerCase().split(' ');
      for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
      }
      return str.join(' ');
    }
  }]);

  angular.module('app').filter('phrase', ['$filter', 'env', function($filter, env) {
    function formatString(phrase, inputs){
      for (var i = 1; i < inputs.length; i++) {
        if (env.phrases[inputs[i]]) {
          inputs[i] = env.phrases[inputs[i]];
        }

        phrase = phrase.replace("%s", inputs[i] || '');
      }
      return phrase;
    }
    return function(v) {
      if (v) {
        var V = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();

        if (arguments.length > 1) {
          var formattedString;

          if (v in env.phrases) {
            formattedString = formatString(env.phrases[v], arguments);
          } else if (V in env.phrases) {
            formattedString = formatString(env.phrases[V], arguments);
          }

          return formattedString;
        } else {
          return env.phrases[v] || env.phrases[V] || v;
        }
      }
    };
  }]);
})();
} catch (error) {
  fsOnErrorHandler(error);
  if (window.Sentry) {
    Sentry.captureException(error);
  } else {
    loadSentry();
  }
}