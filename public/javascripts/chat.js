let HOST = chatLib.HOST;
let EVENT_TYPE = chatLib.EVENT_TYPE;
let PORT = chatLib.PORT;

$(document).ready(function () {
    let socket = null;
    let onlineUserMap = new zTool.SimpleMap();
    let currentUser = null;
    let currentUserNick = null;
    let uid = 1;
    let connCounter = 1;
    let flag = 0;

    if (typeof WebSocket === 'undefined') {
        $("#prePage").hide();
        $("#errorPage").show();
    }

    function updateOnlineUser() {
        let html = ["<div>Online users(" + onlineUserMap.size() + ")</div>"];
        if (onlineUserMap.size() > 0) {
            let users = onlineUserMap.values();
            for (let i in users) {
                html.push("<div>");
                if(!users.hasOwnProperty(i)) continue;
                if (users[i].uid === currentUser.uid) {
                    html.push("<b>" + formatUserString(users[i]) + "(me)</b>");
                } else {
                    html.push(formatUserString(users[i]));
                }
                html.push("</div>");
            }
        }

        $("#onlineUsers").html(html.join(''));
    }

    function appendMessage(msg) {
        $("#talkFrame").append("<div>" + msg + "</div>");
    }

    function formatUserString(user) {
        if (!user) {
            return '';
        }
        return user.nick + "<span class='gray'>(" + user.uid + ")</span> ";
    }

    function formatUserTalkString(user) {
        return formatUserString(user) + new Date().format("hh:mm:ss") + " ";
    }

    function formatUserTalkHisString(user, time) {
        return formatUserString(user) + new Date(time).format("yyyy-MM-dd hh:mm:ss") + " ";
    }

    function reset() {
        if (socket) {
            socket.close();
        }
        socket = null;
        onlineUserMap = null;
        $("#onlineUsers").html("");
        $("#talkFrame").html("");
        $("#nickInput").val("");
    }

    function close() {

    }

    $("#open").click(function () {
        currentUserNick = $.trim($("#nickInput").val());
        if ('' === currentUserNick) {
            alert('Please enter your nickname first');
            return;
        }
        $("#prePage").hide();
        $("#mainPage").show();
        reset();

        socket = new WebSocket("ws://" + HOST + ":" + PORT);
        onlineUserMap = new zTool.SimpleMap();
        socket.onmessage = function (event) {
            let i;
            let mData = chatLib.analyzeMessageData(event.data);

            if (mData && mData.event) {
                switch (mData.event) {
                    case EVENT_TYPE.LOGIN:
                        // The new user connection
                        let newUser = mData.values[0];
                        if (flag === 0) {
                            currentUser = newUser;
                            flag = 1;
                        }
                        connCounter = mData.counter;
                        console.lgo
                        uid = connCounter;
                        onlineUserMap.put(uid, newUser);
                        updateOnlineUser();
                        appendMessage(formatUserTalkString(newUser) + "[Enter the room]");
                        break;

                    case EVENT_TYPE.LOGOUT:
                        // The user exits
                        let user = mData.values[0];
                        //alert(user.uid);
                        onlineUserMap.remove(user.uid);
                        updateOnlineUser();
                        appendMessage(formatUserTalkString(user) + "[Left the room]");
                        break;

                    case EVENT_TYPE.SPEAK:
                        // The user speaks something
                        let content = mData.values[0];
                        if (mData.user.uid !== currentUser.uid) {
                            appendMessage(formatUserTalkString(mData.user));
                            appendMessage("<span>&nbsp;&nbsp;</span>" + content);
                        }
                        break;

                    case EVENT_TYPE.LIST_USER:
                        // Get the current online user
                        let users = mData.values;
                        if (users && users.length) {
                            for (i in users) {
                                // alert(i + ' user : ' + users[i].uid);
                                // alert('uid: ' + currentUser.uid);
                                if(!users.hasOwnProperty(i)) continue;
                                if (users[i].uid !== currentUser.uid) onlineUserMap.put(users[i].uid, users[i]);
                            }
                        }
                        //alert('currentUser:' + currentUser);
                        updateOnlineUser();
                        break;

                    case EVENT_TYPE.LIST_HISTORY:
                        // Get a history message
                        //{'user':data.user,'content':content,'time':new Date().getTime()}
                        let data = mData.values;
                        if (data && data.length) {
                            for (i in data) {
                                if(!data.hasOwnProperty(i)) continue;
                                appendMessage(formatUserTalkHisString(data[i].user, data[i].time));
                                appendMessage("<span>&nbsp;&nbsp;</span>" + data[i].content);
                            }
                            appendMessage("<span class='gray'>==================The above is the most recent messages==================</span>");
                        }
                        break;

                    case EVENT_TYPE.ERROR:
                        // Something went wrong
                        appendMessage("[The system is busy...]");
                        break;

                    default:
                        break;
                }

            }
        };

        socket.onerror = function () {
            appendMessage("[There is something wrong with the network, please try again later...]");
        };

        socket.onclose = function () {
            appendMessage("[The network connection has been turned off...]");
            close();
        };

        socket.onopen = function () {
            socket.send(JSON.stringify({
                'EVENT': EVENT_TYPE.LOGIN,
                'values': [currentUserNick]
            }));
            socket.send(JSON.stringify({
                'EVENT': EVENT_TYPE.LIST_USER,
                'values': [currentUserNick]
            }));
            socket.send(JSON.stringify({
                'EVENT': EVENT_TYPE.LIST_HISTORY,
                'values': [currentUserNick]
            }));
        };
    });

    $("#message").keyup(function (event) {
        if (13 === event.keyCode) {
            sendMsg();
        }
    });

    function sendMsg() {
        let value = $.trim($("#message").val());
        if (value) {
            $("#message").val('');
            appendMessage(formatUserTalkString(currentUser));
            appendMessage("<span>&nbsp;&nbsp;</span>" + value);
            socket.send(JSON.stringify({
                'EVENT': EVENT_TYPE.SPEAK,
                'values': [currentUser.uid, value]
            }));
        }
    }

    $("#send").click(function () {
        sendMsg();
    });

    function show(value) {
        $("#response").html(value);
    }
});
