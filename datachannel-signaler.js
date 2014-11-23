// <script src="/reliable-signaler/datachannel-signaler.js"></script>

function initReliableSignaler(channel, socketURL) {
    var socket;
    
    if (!channel) throw 'DataChannel instance is required.';

    function initSocket() {
        if (socket && channel && channel.isInitiator && channel.roomid) {
            socket.emit('keep-session', channel.roomid);
        }

        socket = io.connect(socketURL || '/');
        socket.on('connect', function() {
            // if socket.io was disconnected out of network issues
            if (socket.isHavingError) {
                initSocket();
            }
        });
        socket.on('message', function(data) {
            //if (data.sender == channel.userid) return;
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
    channel.openSignalingChannel = function(config) {
        var channel = config.channel || this.channel || 'default-channel';
        onMessageCallbacks[channel] = config.onmessage;
        if(config.onopen) setTimeout(config.onopen, 1);
        return {
            send: function(message) {
                socket.emit('message', {
                    sender: channel.userid,
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
            console.warn('Internet channel seems disconnected.');
            return;
        }

        // if socket.io was disconnected out of network issues
        if (socket.isHavingError) {
            initSocket();
        }
    }

    return {
        socket: socket,
        createNewRoomOnServer: function(roomid, successCallback) {
            // for reusability on failures & reconnect
            channel.roomid = roomid;
            
            socket.emit('keep-in-server', roomid || channel.channel, successCallback || function() {});
        },
        getRoomFromServer: function(roomid, callback) {
            socket.emit('get-session-info', roomid, callback);
        }
    };
}
