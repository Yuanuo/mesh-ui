/**
 * Currently a mock service which will eventually use OAuth 2 once it has
 * been implemented on the server.
 *
 * @returns {{isLoggedIn: boolean}}
 */
function authService($cookies) {
    var isLoggedIn = !!$cookies.isLoggedIn,
        onLogInCallbacks = [];

    /**
     * Attempts to log the user in based on the supplied username and password.
     * Return true on success, else false.
     *
     * @param userName
     * @param password
     * @returns {boolean}
     */
    function logIn(userName, password) {
        if (userName === 'admin' && password === 'admin') {
            isLoggedIn = true;
            $cookies.isLoggedIn = true;
            onLogInCallbacks.forEach(function(fn) {
                fn();
            });
        }

        return isLoggedIn;
    }

    /**
     * Register a callback function to be run upon successful login. This is a more explicit
     * flow than using an event-based approach.
     *
     * @param callback
     */
    function onLogIn(callback) {
        onLogInCallbacks.push(callback);
    }

    return {
        get isLoggedIn() {
            return isLoggedIn
        },
        logIn: logIn,
        onLogIn: onLogIn
    };
}

angular.module('caiLunAdminUi')
    .factory('authService', authService);