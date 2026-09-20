# Corinne's 中文 Quest

P1 Chinese spelling practice PWA for Corinne.

## V0 scope
- Android-first, works on Samsung phone/tablet
- 23 Sept 听写（十六） spelling list
- listen and choose quiz
- Chinese text-to-speech
- coins, stars, streaks and badges
- learn mode
- simple writing/tracing canvas
- local-only progress storage
- installable PWA

## Current spelling list
1. 妈妈
2. 爸爸
3. 一公斤
4. 你们
5. 她不会去
6. 我会打球
7. 他们是我的父母

## Run locally
Serve the repo over HTTP, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Product principle
Keep V0 deliberately small. Test whether Corinne voluntarily uses it before adding OCR, cloud accounts, AI generation, broader curriculum coverage or complex reward systems.
