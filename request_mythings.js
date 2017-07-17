'use strict';

const qs = require("querystring");
var https = require("https");
var date = new Date();

// myThings Developersに必要なリクエスト項目
var appid = ""; // TODO AppID
var secret = ""; // TODO secret
var accessToken = ""; // TODO アクセストークン
var refreshToken = ""; // TODO リフレッシュトークン

var deviceId, measureTimestamp, weight;

exports.handler = (event, context, callback) => {
    event.Records.forEach((record) => {
        console.log('DynamoDB Record: %j', record.dynamodb);
        if (record.dynamodb.NewImage !== undefined) {
            deviceId = record.dynamodb.NewImage.DeviceId.S;
            console.log('DeviceId: %j', record.dynamodb.NewImage.DeviceId.S);
            measureTimestamp = record.dynamodb.NewImage.MeasureTimestamp.N;
            console.log('MeasureTimestamp: %j', record.dynamodb.NewImage.MeasureTimestamp.N);
            weight = record.dynamodb.NewImage.Weight.N;
            console.log('macAddress: %j', record.dynamodb.NewImage.Weight.N);
        } else if (record.dynamodb.OldImage !== undefined) {
            deviceId = record.dynamodb.OldImage.DeviceId.S;
            console.log('DeviceId: %j', record.dynamodb.OldImage.DeviceId.S);
            measureTimestamp = record.dynamodb.OldImage.MeasureTimestamp.N;
            console.log('MeasureTimestamp: %j', record.dynamodb.OldImage.MeasureTimestamp.N);
            weight = record.dynamodb.OldImage.Weight.N;
            console.log('macAddress: %j', record.dynamodb.OldImage.Weight.N);
        }
    });
    // 更新データチェック
    if (!deviceId || !measureTimestamp || !weight) {
        context.fail('Updated data is invalid');
    }

    // TODO ここで閾値を超えたかどうかのチェック？ -> 超えていればmyThings Developersへ送信
    // myThings Developersへリクエスト
    requestDevelopers(context);
};

/**
 * myThings Developersへのリクエスト
 * @return void
 */
function requestDevelopers(context) {
    // リクエストパラメータの生成
    var postArgs = {
        data: weight
    };
    var postData = qs.stringify({
        "entry": JSON.stringify(postArgs),
    });

    // リクエスト設定
    var options = {
        hostname: "mythings-developers.yahooapis.jp",
        path: "/v2/services/hogehoge/mythings/hogehoge/run", // TODO hogeの部分のパス指定
        port: 443,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Authorization": "Bearer " + accessToken,
        },
    };

    // リクエスト
    var req = https.request(options, function(res){
        // 401のとき
        if (res.statusCode == 401) {
            // コールバック付きのrefreshAccessTokenを呼ぶ
            refreshAccessToken(context);
            return;
        }

        // レスポンス処理
        res.on("data", function(body){
            var parseData = JSON.parse(body);
            if(typeof( parseData["flag"] ) != "undefined") {
                context.succeed("カスタムトリガーの実行リクエストを受け付けました。");
            } else {
                console.log("カスタムトリガーの実行リクエストの受付に失敗しました。:"+body);
            }
        });
    })
    .on("error", function(res){
        context.fail("カスタムトリガーの実行リクエストの受付に失敗しました。:"+res.content);
    });
    req.end(postData);
}

/**
 * アクセストークンのリフレッシュ
 */
function refreshAccessToken(context) {
    console.log("refreshAccessTokenにきたよ");
    // リフレッシュ用データのセット
    var reqData = qs.stringify({
        "grant_type": "refresh_token",
        "refresh_token": refreshToken
    });
    // リクエスト設定
    var buffer = new Buffer(appid + ":" + secret, "ascii");
    var options = {
        hostname: "auth.login.yahoo.co.jp",
        path: "/yconnect/v1/token",
        port: 443,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "Authorization": "Basic " + buffer.toString("base64"),
        }
    };

    // リクエスト実行
    var req = https.request(options, function(res) {
        console.log("refreshAccessTokenのrequestのなかにきたよ");
        // 401の場合
        if(res.statusCode == 401) {
            context.fail("リフレッシュトークンの有効期限が切れました。myThings Developersのサンプルコードからリフレッシュトークンを再取得して下さい。");
        } else if(res.statusCode != 200) {
            context.fail("カスタムトリガーの実行リクエストの受付に失敗しました。:"+res.content);
        }

        // レスポンス処理
        res.on('data', function(body){
            var parseData = JSON.parse(body);
            accessToken = parseData['access_token'];
            requestDevelopers(context);
        });
    });

    // POSTデータのリクエスト
    req.end(reqData);
}
