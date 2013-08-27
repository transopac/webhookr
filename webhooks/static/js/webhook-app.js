var app = angular.module('webhook', ['ngCookies']);

app.controller('WebhookListCtrl', ['$scope', '$cookies', function($scope, $cookies) {
    $scope.recentWebhooks = {};

    if(typeof $cookies[window.webhookId] == "undefined") {
        $cookies[window.webhookId] = new Date().toLocaleString();
    }

    console.log($cookies);

    $scope.$watch(function() {
        var hash = 0;
        for(var webhookId in $cookies) {
            hash++;
        }

        return hash;
    }, function() {
        $scope.recentWebhooks = [];
        for (var webookId in $cookies) {
            if(webookId.match(/[\S-]{36}/g)) {
                var webHook = {
                    id: webookId,
                    date: $cookies[webookId]
                };
                $scope.recentWebhooks.push(webHook);
            }
        }
        $scope.recentWebhooks.sort(function(a, b){
            return Date.parse(b.date) - Date.parse(a.date);
        });
    });

    $scope.clearRecent = function(){
        for (var webookId in $cookies) {
            if(webookId.match(/[\S-]{36}/g)) {
                delete $cookies[webookId];
            }
        }
    }
}]);

app.controller('RequestListCtrl', ['$scope', function($scope) {
    $scope.requests = [];

    var socket = io.connect('/webhooks');

    socket.on('connect', function(){
        socket.emit('join', window.webhookId);
    });

    socket.on('reconnect', function () {
        console.info('Reconnected to the server');
    });

    socket.on('reconnecting', function () {
        console.info('Attempting to re-connect to the server');
    });

    socket.on('error', function (e) {
        console.error(e ? e : 'A unknown error occurred');
    });

    socket.on('new_request', function(message) {
        message.date = new Date();
        message.dateNumber = Number(message.date);
        message.hasInfo = false;
        message.hasHeaders = false;
        message.hasPost = message.post != 'null' && message.post != '';
        message.hasGet = message.get != 'null' && message.get != '';
        $scope.requests.push(message);
        console.log('new_request');
        console.log(message);
        console.log($scope.requests);
        $scope.playSoundEffect();
    });

    $scope.playSoundEffect = function () {
        // TODO: There's got to be a more angular way to do a singleton and reference an element
        // Probably a factory or maybe a directive
        document.getElementById('audio-event').play();
    }
}]);

app.directive('snippet', ['$timeout', '$interpolate', function($timeout, $interpolate) {
    return {
        restrict: 'E',
        template:'<pre><code class="prettyprint" ng-transclude></code></pre>',
        replace:true,
        transclude:true,
        link:function(scope, elm, attrs){             
            var tmp =  $interpolate(elm.find('code').text())(scope);
             $timeout(function() {                
                elm.find('code').html(hljs.highlightAuto(tmp).value);
              }, 0);
        }
    };
}]);

app.filter('reverse', function() {
    console.log('reverse');
    return function(items) {
        console.log('reverse inner');
        return items.slice().reverse();
    };
});



app.directive('timeSince', function($timeout, dateFilter) {
    // return the directive link function. (compile function not needed)
    return function(scope, element, attrs) {
        var timeoutId; // timeoutId, so that we can cancel the time updates
        var since;   

        function timeSinceFriendly(date) {
            var seconds = Math.floor((new Date() - date) / 1000);

            var interval = Math.floor(seconds / 31536000);

            if (interval > 1) {
                return interval + " years";
            }
            interval = Math.floor(seconds / 2592000);
            if (interval > 1) {
                return interval + " months";
            }
            interval = Math.floor(seconds / 86400);
            if (interval > 1) {
                return interval + " days";
            }
            interval = Math.floor(seconds / 3600);
            if (interval > 1) {
                return interval + " hours";
            }
            interval = Math.floor(seconds / 60);
            if (interval > 1) {
                return interval + " minutes";
            }
            return Math.floor(seconds) + " seconds";
        }

        // used to update the UI
        function updateTime() {
            element.text(timeSinceFriendly(since));  
        }

        scope.$watch(attrs.timeSince, function(value) {
            since = new Date(value);
            updateTime();
        });

        // schedule update in one second
        function updateLater() {
            // save the timeoutId for canceling
            var timeoutId = $timeout(function() {
                updateTime(); // update DOM
                updateLater(); // schedule another update
            }, 1000);
        }

        // listen on DOM destroy (removal) event, and cancel the next UI update
        // to prevent updating time ofter the DOM element was removed.
        element.bind('$destroy', function() {
            $timeout.cancel(timeoutId);
        });

        updateLater(); // kick off the UI update process.
    }
});
