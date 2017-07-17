'use strict';

const qs = require("querystring");
var date = new Date();

var AWS = require("aws-sdk");
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    // パラメータチェック
    if (!event.data) {
        context.fail('macAddress is not specified');
    }

    // uuidを生成
    var uuid = createUuid();

    // 更新内容をセット
    var item = {
        "DeviceId": event.data.deviceId,
        "MeasureTimestamp":  parseInt(event.data.measureTimestamp),
        "Weight": parseInt(event.data.weight),
        "LogId": uuid
    };

    var param = {
        TableName: 'Tabegram',
        Item: item
    };
    dynamo.put(param, function(err, data) {
        if (err) {
            context.fail(err);
        } else {
            context.succeed(item);
        }
    });
};

/**
 * UUID(ランダム文字列)の生成
 * @return string UUID
 */
function createUuid() {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
}
