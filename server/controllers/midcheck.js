const midcheck = require('../dao/midcheck');
const notice = require('../dao/notice');
const conclude = require('../dao/conclude');
const moment = require('moment');

module.exports = {
    // 分页查询
    getByPage(req, res, next) {
        const resData = {
            pageNum: req.query.pageNum,
            pageSize: req.query.pageSize
        };
        midcheck.getSum(req.query)
            .then((sum) => {
                if (sum && sum.length) {
                    resData['total'] = sum[0]['count(*)'];
                    return midcheck.getByPage(req.query);
                }
            })
            .then((data) => {
                if (data) {
                    resData['list'] = data;
                    res.json({
                        code: 1,
                        data: resData,
                        msg: 'success',
                    });
                }
            })
            .catch((e) => {
                res.json({
                    result: -1,
                    msg: '获取项目中期检查信息失败' + JSON.stringify(e)
                })
            });
    },
    save(req, res, next) {
        const person = require('./person').getSelect();
        const project = require('./projectApply').getSelect();
        midcheck.save(req, res, next)
            .then((data) => {
                if (data) {
                    if (req.body.Id && req.body.midcheck_time && req.body.midcheck_time !== 'null') {
                        console.log('begin insert conclude···')
                        conclude.save({
                            body: {
                                project_id: req.body.project_id,
                                principal_id: req.body.principal_id,
                            }
                        }).then(conclude => {
                            notice.save({
                                sendman_id: null,
                                acceptman_id: Object.keys(person).filter(val => val.indexOf('g') > -1).toString(),
                                content: `项目-${project[conclude[0].project_id]}已结束中期检查，请尽快设置结题的截止时间`,
                                type: '3-3',
                                target_id: conclude[0].Id,
                            });
                            notice.save({
                                sendman_id: null,
                                acceptman_id: conclude[0].principal_id,
                                content: `您的项目-${project[conclude[0].project_id]}已进入结题阶段，等待管理员设置截止时间`,
                                type: '3-2',
                                target_id: conclude[0].Id,
                            });
                        });
                    }

                    // 消息通知
                    switch (Number(req.body.status)) {
                        case 1:
                            if (req.body.opt == 'reset') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: req.body.principal_id,
                                    content: `管理员${person[req.body.setman_id]}对您的项目-${project[req.body.project_id]}修改了截止时间`,
                                    type: '2-2',
                                    target_id: req.body.Id,
                                });
                            } else if (req.body.opt == 'aextend') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: req.body.setman_id,
                                    content: `负责人申请延长截止时间，请尽快处理`,
                                    type: '2-3',
                                    target_id: req.body.Id,
                                });
                            } else if (req.body.opt == 'nextend') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: req.body.principal_id,
                                    content: `管理员驳回了延长申请`,
                                    type: '2-2',
                                    target_id: req.body.Id,
                                });
                            } else {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: req.body.principal_id,
                                    content: `管理员${person[req.body.setman_id]}已为您的项目-${project[req.body.project_id]}设置了截止时间，请尽快提交中期检查材料`,
                                    type: '2-2',
                                    target_id: req.body.Id,
                                });
                            }
                            break;
                        case 2:
                            if (req.body.opt == 'submit') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: Object.keys(person).filter(val => val.indexOf('z') > -1).toString(),
                                    content: `项目-${project[req.body.project_id]}的负责人提交了中期检查材料，请尽快前往评审`,
                                    type: '2-4',
                                    target_id: req.body.Id,
                                });
                            }
                            break;
                        case 3:
                            notice.save({
                                sendman_id: null,
                                acceptman_id: req.body.principal_id,
                                content: `您的项目-${project[req.body.project_id]}已被专家${person[req.body.checkman_id]}重新评审为通过`,
                                type: '2-2',
                                target_id: req.body.Id,
                            });
                            notice.save({
                                sendman_id: null,
                                acceptman_id: Object.keys(person).filter(val => val.indexOf('g') > -1).toString(),
                                content: `项目-${project[req.body.project_id]}评审通过，请尽快前往结束中期检查阶段`,
                                type: '2-5',
                                target_id: req.body.Id,
                            });
                            break;
                        case 4:
                            if (req.body.opt == 'check') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: req.body.principal_id,
                                    content: `您的项目-${project[req.body.project_id]}未通过专家${person[req.body.checkman_id]}的评审`,
                                    type: '2-2',
                                    target_id: req.body.Id,
                                });
                            }
                            break;
                        case 5:
                            if (req.body.opt == 'apply') {
                                notice.save({
                                    sendman_id: null,
                                    acceptman_id: Object.keys(person).filter(val => val.indexOf('z') > -1).toString(),
                                    content: `${person[req.body.principal_id]}对未通过评审的项目-${project[req.body.project_id]}发起重新评审，请尽快前往评审`,
                                    type: '2-4',
                                    target_id: req.body.Id,
                                });
                            }
                            break;
                        case 6:
                            notice.save({
                                sendman_id: null,
                                acceptman_id: req.body.principal_id,
                                content: `恭喜您，您的项目-${project[req.body.project_id]}已顺利结束中期检查阶段`,
                                type: '2-2',
                                target_id: req.body.Id,
                            });
                            break;
                        default:
                            break;
                    }

                    res.json({
                        code: 1,
                        data,
                        msg: 'success',
                    });
                }
            })
            .catch(function (e) {
                console.log(e)
                res.json({
                    code: 0,
                    msg: '中期检查保存失败' + e,
                });
            });
    },
    delete(req, res, next) {
        midcheck.delete(req.query.Id)
            .then(function (data) {
                console.log(data);
                if (data) {
                    res.json({
                        code: 1,
                        data,
                        msg: 'success',
                    });
                }
            })
            .catch(function (e) {
                console.log(e)
                res.json({
                    code: 0,
                    msg: '中期检查删除失败' + e,
                });
            });
    },
    // 图表数据
    getCharts(req, res, next) {
        let lastM = '';
        let lastMFirst = ''; // 上月第一天
        let lastMEnd = ''; // 上月最后一天
        let searchArray = [];
        // 月总中期成功数
        for (let i = 0; i < 12; i++) {
            lastM = moment().subtract(i + 1, 'M');
            lastMFirst = moment(new Date(lastM.format('YYYY-MM-') + '01')).format('YYYY-MM-DD 00:00:00'); // 上月第一天
            lastMEnd = moment(new Date(lastM.format('YYYY'), lastM.format('MM'), 0)).format('YYYY-MM-DD 23:59:59'); // 上月最后一天
            searchArray.unshift({
                startTime: lastMFirst,
                endTime: lastMEnd,
            });
        }
        Promise.all(searchArray.map((value, index) =>
                midcheck.getByMidchecked(value)
                .then(res => ({
                    x: moment(res.time).format('YYYY-MM'),
                    y: res.data[0]['count(*)'],
                }))
            ))
            .then((data) => {
                res && res.json({
                    code: 1,
                    data,
                    msg: 'success',
                })
            }).catch(err => {
                console.log(err);
                res && res.json({
                    code: -1,
                    msg: '服务器出错，错误原因：' + err,
                })
            });
    },
}