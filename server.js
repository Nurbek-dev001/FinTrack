const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API для транзакций
let transactions = [];

app.get('/api/transactions', (req, res) => {
    res.json(transactions);
});

app.post('/api/transactions', (req, res) => {
    const transaction = {
        id: Date.now(),
        ...req.body
    };
    transactions.push(transaction);
    res.status(201).json(transaction);
});

app.delete('/api/transactions/:id', (req, res) => {
    const id = parseInt(req.params.id);
    transactions = transactions.filter(t => t.id !== id);
    res.status(204).send();
});

// Все остальные запросы перенаправляем на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});