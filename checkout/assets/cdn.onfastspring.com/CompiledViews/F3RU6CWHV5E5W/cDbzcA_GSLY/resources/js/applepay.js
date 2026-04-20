try {
  (function () {
    angular.module('app').controller('applepayController', ['$scope', '$http', '$filter', function ($scope, $http, $filter) {
      let applePayMerchantId = null;
      let applePayPaymentOptions = {};
      let scale = 2;
      let items = [];
      let sessionId = null;
      let siteId = null;
      let storeFront = "";
      let appleResponse = null;
      const APPLE_PAY = "ApplePay";

      $scope.triggerApplePay = function(form) {
        if ($scope.enableEmbeddedApplePay && $scope.applePayEmbeddedLoading) {
          console.debug("Please try again");
          return;
        }

        if ($scope.enableEmbeddedNativeApplePay) {
          startApplePayWidget();
          return;
        }

        // Show popup window
        $scope.startApplePay(form);
      };

      function verifyApplePayButton() {
        ApplePaySession.applePayCapabilities(applePayMerchantId)
          .then(verifyApplePayButtonResponse).catch(applePayUnsupported)
      }

      function verifyApplePayButtonResponse(capabilities) {
        switch (capabilities.paymentCredentialStatus) {
          case "paymentCredentialsAvailable":
            // Good
            applePaySupported();
            break;
          case "paymentCredentialStatusUnknown": // This is going to show the QR code, which is not supported in the button iFrame
            applePayUnsupported({}, 'disabled');
            break;
          case "paymentCredentialsUnavailable": // This is going to show the QR code, which is not supported in the button iFrame
            applePayUnsupported({}, 'disabled');
            break;
          case "applePayUnsupported":
            applePayUnsupported({}, 'disabled');
            break;
          default: // Fall back
            applePayUnsupported({}, 'disabled');
            break;
        }
      }

      function applePayUnsupported(e, level) {
        if (e && e.name === 'AbortError') {
          // User canceled popup, don't revert to AP window
          return;
        }
        // Send failed event to show classic popup window
        let eventData = {
          type: APPLE_PAY,
          action: level ? level : 'unsupported'
        };
        window.postMessage(eventData);
      }

      function applePaySupported() {
        // Send success event to hide spinner
        let eventData = {
          type: APPLE_PAY,
          action: 'load-complete'
        };
        window.postMessage(eventData);
      }

      function startApplePayWidget(){
        try {
          // Build Request for payment
          const request = new PaymentRequest(buildPaymentMethodData(), buildPaymentDetails(), buildPaymentOptions());

          // Attach callbacks
          request.onmerchantvalidation = event => {
            createApplePaySession(event);
          };

          request.onpaymentmethodchange = handleOnPaymentMethodChange;
          request.onshippingoptionchange = handleOnShippingOptionChange;
          request.onshippingaddresschange = handleOnShippingAddressChange;

          // Show Apple popup
          request.show().then(completePayment).catch(applePayUnsupported);
        } catch(ex){
          console.log("Unable to create PaymentRequest", ex);
          applePayUnsupported();
        }
      }

      function flattenItems(groups) {
        let items = [];
        if (groups && groups.length > 0) {
          groups.forEach(function (group) {
            if (group.selections) {
              group.items.forEach(function (item) {
                if (item.selected) {
                  items.push(item);
                  items = items.concat(flattenItems(item.groups));
                }
              });
            }
          });
        }
        return items;
      }

      function buildPaymentMethodData() {
        const paymentMethodData = {
          supportedMethods: "https://apple.com/apple-pay",
          data: {
            version: 3,
            merchantIdentifier: applePayMerchantId,
            supportedNetworks: ['amex', 'discover', 'visa', 'masterCard', 'jcb'],
            merchantCapabilities: ['supportsCredit', 'supportsDebit', 'supports3DS'],
            countryCode: $scope.country,
            requiredBillingContactFields: ['email', 'name', 'phone', 'postalAddress'],
            requiredShippingContactFields: []
          }
        };

        if (applePayPaymentOptions.requireShipping) {
          paymentMethodData.data.requiredShippingContactFields = ['name', 'phone', 'postalAddress'];
        }
        return [paymentMethodData];
      }

      function buildPaymentDetails(){
        let paymentDetails = {
          total: buildTotal(),
          modifiers: [{
            supportedMethods: "https://apple.com/apple-pay",
            data: {}
          }]
        };
        // Add recurring if needed
        let recurringPaymentRequest = buildRecurringPaymentRequest();
        if (recurringPaymentRequest.regularBilling.amount > 0) {
          paymentDetails.modifiers[0].data.recurringPaymentRequest = recurringPaymentRequest;
        }
        // Add non recurring as needed
        let displayItems = buildDisplayItems();
        if (displayItems.length > 0){
          paymentDetails.displayItems = displayItems;
        }
        // Add tax line
        let additionalLineItems = buildAdditionalLineItems();
        if (additionalLineItems.length > 0){
          paymentDetails.modifiers[0].data.additionalLineItems = additionalLineItems;
        }

        return paymentDetails;
      }

      function buildPaymentOptions() {
        return {
          "requestPayerName": true,
          "requestBillingAddress": true,
          "requestPayerEmail": true,
          "requestPayerPhone": true,
          "requestShipping": false,
          "shippingType": "shipping"
        };
      }
      function buildTotal(){
        return {
          "label": $filter('phrase')('ViaFastspring') || 'PAY',
          amount: {
            currency: $scope.order.currency,
            value: $scope.order.totalWithTaxValue.toFixed(scale)
          }
        };
      }

      function buildRecurringPaymentRequest() {
        let accountManagementUrl = $scope.session.accountManagementUrl;
        if (!accountManagementUrl) {
          accountManagementUrl = "https://fsprg.com";
        }
        let recurringPaymentRequest = {
          paymentDescription: "",
          regularBilling: {
            label: "Recurring",
            amount: 0,
            paymentTiming: "recurring"
          },
          //billingAgreement: "FastSpring Merchant",
          managementURL: accountManagementUrl,
          tokenNotificationURL: $scope.paymentServiceUrl + "/api/v1/applepay/webhooks/"
        };
        let paymentDescription = "";
        let regularBillingAmount = 0;
        let app = this;

        // Loop over items and add to request
        items.forEach(function (item) {
          if (!item.subscription) {
            return;
          }
          if (item.subscription.intervalUnit === 'adhoc') {
            return;
          }
          // Add trial
          let isTrial = item.subscription.instructions && item.subscription.instructions.length > 1 && item.subscription.instructions[0].type == "trial";
          if (isTrial) {
            recurringPaymentRequest.trialBilling = {
              label: item.display || item.path,
              amount: item.subscription.instructions[0].trialType === "PAID" ? item.priceTotalValue : item.subscription.instructions[0].totalValue.toFixed(app.scale),
              paymentTiming: "recurring",
              recurringPaymentIntervalUnit: item.subscription.instructions[0].discountDurationUnit,
              recurringPaymentIntervalCount:item.subscription.instructions[0].discountDurationLength,
              recurringPaymentEndDate: new Date(item.subscription.nextChargeDateValue).toISOString()
            }
          }

          // Add paid
          regularBillingAmount += item.subscription.nextChargeTotalValue;
          if (item.subscription.intervalUnit === 'week'){
            item.subscription.intervalUnit = "day";
            item.subscription.intervalLength = item.subscription.intervalLength * 7;
          }
          recurringPaymentRequest.regularBilling.recurringPaymentIntervalUnit = item.subscription.intervalUnit ? item.subscription.intervalUnit : "month";
          recurringPaymentRequest.regularBilling.recurringPaymentIntervalCount = item.subscription.intervalLength ? item.subscription.intervalLength : 1;
          recurringPaymentRequest.regularBilling.recurringPaymentStartDate = isTrial ? new Date(item.subscription.nextChargeDateValue).toISOString() : new Date().toISOString();
          if (paymentDescription !== ""){
            paymentDescription += ", ";
          }
          paymentDescription += item.display || item.path;
        });
        recurringPaymentRequest.regularBilling.amount = regularBillingAmount.toFixed(scale);
        recurringPaymentRequest.paymentDescription = paymentDescription;
        recurringPaymentRequest.regularBilling.label = paymentDescription;

        return recurringPaymentRequest;
      }

      function buildAutomaticReloadPaymentRequest(){
        let accountManagementUrl = $scope.session.accountManagementUrl;
        if (!accountManagementUrl) {
          accountManagementUrl = "https://fsprg.com";
        }
        let automaticReloadPaymentRequest = {
          paymentDescription: "",
          automaticReloadBilling: {
            label: "",
            amount: "0.00",
            paymentTiming: "automaticReload",
            automaticReloadPaymentThresholdAmount: "1.00"
          },
          managementURL: accountManagementUrl,
          tokenNotificationURL: $scope.paymentServiceUrl  + "/api/v1/applepay/webhooks/"
        };
        let regularBillingAmount = 0;
        let name = "";
        items.forEach(function (item) {
          if (!item.subscription) {
            return;
          }
          if (item.subscription.intervalUnit !== 'adhoc') {
            return;
          }
          regularBillingAmount += item.subscription.nextChargeTotalValue;
          if (name !== ""){
            name += ", ";
          }
          name += item.display || item.path;
        });
        automaticReloadPaymentRequest.automaticReloadBilling.amount = regularBillingAmount.toFixed(scale);
        automaticReloadPaymentRequest.automaticReloadBilling.automaticReloadPaymentThresholdAmount = regularBillingAmount.toFixed(scale);
        automaticReloadPaymentRequest.automaticReloadBilling.label = name;
        automaticReloadPaymentRequest.paymentDescription = name;
        if (regularBillingAmount > 0){
          return automaticReloadPaymentRequest;
        }
      }
      function buildDisplayItems() {
        let displayItems = [];

        // Loop over items and add to request
        items.forEach(function (item) {
          if (item.subscription) {
            return;
          }
          if (item.priceValue === 0) {
            return;
          }

          displayItems.push({
            label: item.display || item.path,
            amount: {value: item.totalValue.toFixed(scale), currency: $scope.order.currency}
          });
        });

        return displayItems;
      }

      function buildAdditionalLineItems() {
        let additionalLineItems = [];

        // Add subscriptions
        items.forEach(function (item) {
          if (!item.subscription) {
            return;
          }
          if (item.priceValue === 0) {
            return;
          }
          additionalLineItems.push({
            label: item.display || item.path,
            amount:item.totalValue.toFixed(scale),
            paymentTiming: "recurring"
          });
        });

        // Add tax line item
        if ($scope.order.taxValue && $scope.order.taxValue > 0 && $scope.order.taxPriceType !== 'included') {
          additionalLineItems.push({
            "label": $filter('phrase')('Tax') || 'TAX',
            amount: $scope.order.taxPriceType === 'included' ? "0" : $scope.order.taxValue.toFixed(scale)
          });
        }

        return additionalLineItems;
      }
      function createApplePaySession(event) {
        let parentDomain = document.location.origin.replace("https://", "").replace("http://", "");
        if (document.location.ancestorOrigins.length > 0) {
          parentDomain = document.location.ancestorOrigins[document.location.ancestorOrigins.length - 1].replace("https://", "").replace("http://", "");
        }
        let postBody = {
          validationURL: event.validationURL,
          sessionId: sessionId,
          siteId: siteId,
          storeFront: storeFront,
          merchantId: applePayMerchantId,
          domain: parentDomain,
          displayName: $filter('phrase')('ViaFastspring') || 'FastSpring'
        };

        // Call backend and create new apple pay session
        return $http.post($scope.paymentServiceUrl + 'applepay/session', postBody)
          .then(function(response) {
            // On success, this calls the ApplePay SDK and popups the applepay window
            event.complete(response.data);
          }).catch(applePayUnsupported);
      }
      function handleOnShippingOptionChange(event){
        event.updateWith({});
      }
      function handleOnShippingAddressChange(event){
        event.updateWith(
          new Promise((resolve) => {
            processAddressUpdates(event, (d) => resolve(d));
          })
        );
      }
      async function handleOnPaymentMethodChange(event){
        event.updateWith(
          new Promise((resolve) => {
            processAddressUpdates(event, (d) => resolve(d));
          })
        );
      }

      function processAddressUpdates(event, callback){
        let postBody = {};
        if (event.target.shippingAddress){
          postBody = {
            country: event.target.shippingAddress.country,
            postalCode: event.target.shippingAddress.postalCode
          };
        } else if (event.methodDetails.billingContact){
          postBody = {
            country: event.methodDetails.billingContact.countryCode,
            postalCode: event.methodDetails.billingContact.postalCode
          };
        }
        $http.put($scope.session.location + '/wallets/session', postBody)
          .then(function(response) {
            $scope.order = response.data.order;
            items = flattenItems($scope.order.groups);
            let body = buildPaymentDetails();
            callback(body);
          });
      }

      function completePayment(appleData) {
        appleResponse = appleData;

        // Validate Inputs. Note we send "" so Apple falls backs translated text.
        let errors = {};
        if ((!appleData.details.billingContact.familyName || appleData.details.billingContact.familyName.trim() === '')
          || (!appleData.details.billingContact.givenName || appleData.details.billingContact.givenName.trim() === '')) {
          errors.payer = { general: ""};
        }else if (!appleData.payerName || appleData.payerName.trim() === '') {
          errors.payer = { name: "" };
        } else if (!appleData.payerEmail || appleData.payerEmail.trim() === '') {
          errors.payer = { email: "" };
        } else if (!appleData.payerPhone || appleData.payerPhone.replaceAll(/[^0-9]/gi, "").length < 7) {
          errors.payer = { phone: "" };
        }

        // Handle errors
        if (Object.keys(errors).length > 0){
          appleData.retry(errors).then(() => { completePayment(appleData); });
          return;
        }

        let eventData = {
          type: APPLE_PAY,
          action: 'success',
          billingContact: appleData.details.billingContact,
          shippingContact: appleData.details.shippingContact,
          paymentMethod: appleData.details.token.paymentMethod,
          data: appleData.details.token.paymentData.data,
          signature: appleData.details.token.paymentData.signature,
          version: appleData.details.token.paymentData.version,
          header: appleData.details.token.paymentData.header,
          transactionIdentifier: appleData.details.token.transactionIdentifier,
          email : appleData.payerEmail,
          fullName : appleData.payerName,
          phoneNumber : appleData.payerPhone
        };
        window.postMessage(eventData);
      }

      // Setup AP
      function init() {
        // Skip validate for window
        if (!$scope.enableEmbeddedNativeApplePay){
          return;
        }

        applePayMerchantId = $scope.paymentOptionVariables.applePayMerchantId;
        scale = $scope.order.currency === "JPY" || $scope.order.currency === "HUF" ? 0 : 2;
        sessionId = $scope.session.id;
        siteId = $scope.siteId;
        storeFront = $scope.session.primary + ($scope.session.secondary ? "/" + $scope.session.secondary : "");

        for(let i=0; i< $scope.paymentOptions.length; i++){
          if ($scope.paymentOptions[i].type === "applepay") {
            applePayPaymentOptions = $scope.paymentOptions[i];
          }
        }
        items = flattenItems($scope.order.groups);

        window.addEventListener("message", (event) => {
          if (event.data.operation != 'ApplePay' && !appleResponse) {
            return;
          }
          if (event.data.action === "success" || event.data === "success") {
            appleResponse.complete("success");
          } else if (event.data.action === "fail" || event.data === "fail") {
            appleResponse.complete("fail");
          }
        });

        // Verify
        verifyApplePayButton();
      }

      // trigger setup
      init();
    }]);

  })();
} catch (e){
  fsOnErrorHandler(error);
  if (window.Sentry) {
    Sentry.captureException(error);
  } else {
    loadSentry();
  }
}