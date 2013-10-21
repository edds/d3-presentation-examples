/*!
  (c) 2013 Edd Sowden
  Licenced for reuse under the MIT Licence
*/
(function(){
  "use strict"
  if(typeof window.googleUser === 'undefined'){ window.googleUser = {} }

  window.googleUser = {
    user: false,
    callbacks: [],
    outstandingCallbacks: [],

    getUser: function(callback){
      var hash = window.location.hash;

      googleUser.callback = callback;
      if(googleUser.user !== false){
        googleUser.callback();
      } else {
        if(hash.indexOf('token') > -1){
          googleUser.validateToken();
        } else {
          googleUser.requestAuth();
        }
      }
    },
    requestAuth: function(){
      var endpoint = 'https://accounts.google.com/o/oauth2/auth',
          auth = {
            response_type: 'token',
            client_id: googleClientID,
            redirect_uri: window.location.href.split('#')[0],
            scope: 'https://www.googleapis.com/auth/analytics.readonly',
            state: '',
            approval_prompt: 'auto'
          };

      window.location = endpoint + "?" + $.param(auth);
    },
    validateToken: function(){
      var params = googleUser.paramsFromHash(),
          endpoint = 'https://www.googleapis.com/oauth2/v1/tokeninfo?callback=?';

      if(typeof params.access_token !== 'undefined'){
        window.location.hash = '';
        googleUser.user = {
          accessToken: params.access_token
        };

        $.ajax({
          dataType: 'json',
          url: endpoint,
          data: { access_token: params.access_token },
          success: function(data){
            googleUser.user.expires = (+new Date()) + (data.expires_in * 1000);
            googleUser.user.id = data.user_id;
            googleUser.user.email = data.email;
            googleUser.callback(googleUser.user);
          }
        });
      }
    },
    paramsFromHash: function(){
      var hash = window.location.hash,
          params = {},
          chunk, i, _i;

      if(hash.indexOf('#') > -1){
        hash = hash.substr(1);
      }
      hash = hash.split('&');
      for(i=0,_i=hash.length; i<_i; i++){
        chunk = hash[i].split('=');
        params[decodeURIComponent(chunk[0])] = decodeURIComponent(chunk[1]);
      }
      return params;
    },
    apiRequest: function(requestUri, callback){
      var extraParams = '', authedRequestUri;
      if(googleUser.user === false){
        googleUser.callbacks.push([requestUri, callback]);
        googleUser.getUser(function(){
          var i, _i;
          for(i=0,_i=googleUser.callbacks.length; i<_i; i++){
            googleUser.apiRequest(googleUser.callbacks[i][0], googleUser.callbacks[i][1]);
          }
        });
      } else {
        if(+new Date() < googleUser.user.expires){
          extraParams = 'access_token='+googleUser.user.accessToken+'&callback=?';

          authedRequestUri = requestUri + (requestUri.indexOf('?') > -1 ? '&' : '?') + extraParams;

          $.ajax({
            dataType: 'json',
            url: authedRequestUri,
            success: (function(){
              var callbackId = Math.random();
              googleUser.outstandingCallbacks.push(callbackId);
              return function(data){
                if(googleUser.outstandingCallbacks.indexOf(callbackId) > -1){
                  callback(data);
                }
              }
            }())
          });
        } else {
          alert('Your session has expired, you will need to relogin to continue');
        }
      }
    },
    reset: function(){
      googleUser.outstandingCallbacks = [];
    }
  };
}).call(this);
