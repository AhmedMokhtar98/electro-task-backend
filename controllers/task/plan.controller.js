// controllers/admin/plan.controller.js
const planRepo = require("../../models/plan/plan.repo");


exports.create = async (req, res)=>{
    const operationResultObject = await planRepo.create(req.body);
    return res.status(operationResultObject.code).json(operationResultObject);
}


exports.list = async (req, res)=>{
    const filterObject = req.query;
    const operationResultObject = await planRepo.list(filterObject, { password: 0 }, {});
    return res.status(operationResultObject.code).json(operationResultObject);
}

exports.get = async (req, res)=>{
    const {id} = req.params;
    const operationResultObject = await planRepo.get(id);
    return res.status(operationResultObject.code).json(operationResultObject);    
}

exports.update = async (req, res)=>{
    const {id} = req.params;
    const operationResultObject = await planRepo.update(id, req.body);
    return res.status(operationResultObject.code).json(operationResultObject);
}

exports.remove = async (req, res)=>{
    const {id} = req.params;
    const permanent = req.body.permanent;
    const operationResultObject = await planRepo.remove(id, permanent);
    return res.status(operationResultObject.code).json(operationResultObject);
}


