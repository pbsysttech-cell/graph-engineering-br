<?php
/*
 * CONFIGURAÇÃO DO SERVIDOR (só este arquivo precisa ser editado).
 *
 * 1) No hPanel da Hostinger: Bancos de dados > MySQL > crie um banco e um usuário.
 *    Copie aqui o nome do banco, o usuário e a senha (o host costuma ser "localhost").
 * 2) Defina o usuário e a senha do painel de leads (admin.html).
 *
 * Este arquivo não é público: o .htaccess desta pasta bloqueia o acesso direto,
 * e mesmo sem ele o PHP só executa, nunca mostra o conteúdo.
 */

// ---- Banco de dados MySQL (Hostinger) ----
const DB_HOST = 'localhost';
const DB_NAME = '';          // ex.: u123456789_leads
const DB_USER = '';          // ex.: u123456789_mateus
const DB_PASS = '';

// ---- Acesso ao painel ----
const ADMIN_USER = 'mateus';
// Coloque uma senha forte (mínimo 10 caracteres). O painel não abre enquanto estiver vazia.
const ADMIN_PASSWORD = '';

// Texto aleatório usado para anonimizar IPs no controle anti-spam. Troque por qualquer frase longa.
const IP_SALT = 'troque-esta-frase-por-qualquer-coisa-longa';
