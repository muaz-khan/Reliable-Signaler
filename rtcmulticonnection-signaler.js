// <script src="/reliable-signaler/rtcmulticonnection-signaler.js"></script>

function initReliableSignaler(connection, socketURL) {
    var socket;
    
    if (!connection) throw 'RTCMultiConnection instance is required.';

    function initSocket() {
        if (socket && connection && connection.isInitiator && connection.sessionid) {
            socket.emit('keep-session', connection.sessionid);
        }

        socket = io.connect(socketURL || '/');
        socket.on('connect', function() {
            // if socket.io was disconnected out of network issues
            if (socket.isHavingError) {
                initSocket();
            }
        });
        socket.on('message', function(data) {
            if (data.sender == connection.userid) return;
            if (onMessageCallbacks[data.channel]) {
                onMessageCallbacks[data.channel](data.message);
            };
        });
        socket.on('error', function() {
            socket.isHavingError = true;
            initSocket();
        });

        socket.on('disconnect', function() {
            socket.isHavingError = true;
            initSocket();
        });
    }
    initSocket();

    var onMessageCallbacks = {};

    // using socket.io for signaling
    connection.openSignalingChannel = function(config) {
        var channel = config.channel || this.channel;
        onMessageCallbacks[channel] = config.onmessage;
        if (config.onopen) setTimeout(config.onopen, 1000);
        return {
            send: function(message) {
                socket.emit('message', {
                    sender: connection.userid,
                    channel: channel,
                    message: message
                });
            },
            channel: channel
        };
    };

    function listenEventHandler(eventName, eventHandler) {
        window.removeEventListener(eventName, eventHandler);
        window.addEventListener(eventName, eventHandler, false);
    }

    listenEventHandler('load', onLineOffLineHandler);
    listenEventHandler('online', onLineOffLineHandler);
    listenEventHandler('offline', onLineOffLineHandler);

    function onLineOffLineHandler() {
        if (!navigator.onLine) {
            console.warn('Internet connection seems disconnected.');
            return;
        }

        // if socket.io was disconnected out of network issues
        if (socket.isHavingError) {
            initSocket();
        }
    }

    return {
        socket: socket,
        createNewRoomOnServer: function(sessionid, callback) {
            socket.emit('keep-in-server', sessionid || connection.sessionid, callback || function() {});
        },
        getRoomFromServer: function(sessionid, callback) {
            socket.emit('get-session-info', sessionid, callback);
        }
    };
}
