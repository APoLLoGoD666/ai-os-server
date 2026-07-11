'use strict';
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const express = require('express');

module.exports = function mountExpressConfig(app) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc:  ["'self'"],
                scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
                styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                connectSrc:  ["'self'", 'wss:', 'https:', 'http://localhost:5002', 'http://127.0.0.1:5002'],
                imgSrc:      ["'self'", 'data:', 'blob:'],
                mediaSrc:    ["'self'", 'blob:'],
                workerSrc:   ["'self'", 'blob:'],
                fontSrc:     ["'self'", 'data:', 'https://fonts.gstatic.com'],
                objectSrc:      ["'none'"],
                frameSrc:       ["'none'"],
                scriptSrcAttr:  ["'none'"],
            }
        },
        crossOriginEmbedderPolicy: false
    }));
    app.use(cors({
        origin: [
            'https://apex-ai-os-cos.uk',
            'https://www.apex-ai-os-cos.uk',
            'https://ai-os-server-jx20.onrender.com'
        ],
        credentials: true
    }));
    app.use(compression());
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true }));
};
