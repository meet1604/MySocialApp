const axios = require('axios');
const FormData = require('form-data');

const BASE = process.env.BACKEND_URL || 'http://localhost:8000/api';

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 15000,
  });
}

async function login(email, password) {
  const res = await client().post('/auth/login', { email, password });
  return res.data; // { token, user }
}

async function getConnectedAccounts(token) {
  const res = await client(token).get('/social/status');
  return res.data; // { status: { INSTAGRAM: {...}, LINKEDIN: {...} } }
}

async function uploadMedia(token, fileBuffer, mimetype, filename) {
  const form = new FormData();
  form.append('media', fileBuffer, { contentType: mimetype, filename });
  const res = await client(token).post('/posts/upload', form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });
  return res.data; // { mediaUrl, mediaType }
}

async function createPost(token, postData) {
  const res = await client(token).post('/posts', postData);
  return res.data; // { post }
}

async function listPosts(token, status) {
  const params = status ? { status } : {};
  const res = await client(token).get('/posts', { params });
  return res.data; // { posts }
}

module.exports = { login, getConnectedAccounts, uploadMedia, createPost, listPosts };
