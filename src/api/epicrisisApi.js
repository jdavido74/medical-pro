import { baseClient } from './baseClient';

const ENDPOINT = '/epicrises';

export const createEpicrisis = async (data) => baseClient.post(ENDPOINT, data);
export const getEpicrisis = async (id) => baseClient.get(`${ENDPOINT}/${id}`);
export const getEpicrisisForRecord = async (recordId) => baseClient.get(`${ENDPOINT}/record/${recordId}`);
export const updateEpicrisis = async (id, data) => baseClient.put(`${ENDPOINT}/${id}`, data);
export const finalizeEpicrisis = async (id) => baseClient.post(`${ENDPOINT}/${id}/finalize`);
export const signEpicrisis = async (id, password) => baseClient.post(`${ENDPOINT}/${id}/sign`, { password });
export const verifyEpicrisis = async (id) => baseClient.get(`${ENDPOINT}/${id}/verify`);

export default { createEpicrisis, getEpicrisis, getEpicrisisForRecord, updateEpicrisis, finalizeEpicrisis, signEpicrisis, verifyEpicrisis };
