# 🇯🇵 TabiTalk (타비토크 / 旅トーク)
**손님(A) ↔ 종업원(B) 역할교대 일본어 실전 회화 · 오프라인 돌발번역 · JLPT N3 한자/단어장 모바일 웹 앱 (PWA)**

## ✨ 핵심 기능
1. **양방향 역할 바꾸기 회화 (Role-Swap)**
   - **손님(A)** 역할뿐만 아니라 **종업원(B)** 역할로도 대화를 주고받으며 일본 매장 직원들의 빠른 접객 경어를 입과 귀로 동시에 익힙니다.
   - **가이드 스크립트 모드** + **실전 AI 프리토킹 모드**(스마트 시뮬레이션 기본 탑재 & Gemini/OpenAI API 연동 지원)
2. **오프라인 100% 작동 돌발상황 실시간 번역기 & SOS 빅카드**
   - 해외 로밍/eSIM 데이터가 끊기거나 지하 매장에 있을 때도 내장 오프라인 번역 사전·문형 조합 엔진과 PWA Service Worker 캐싱으로 즉시 작동합니다.
   - 위급할 때 점원·역무원·경찰에게 스마트폰 화면 전체로 크게 보여줄 수 있는 **SOS 빅카드 모드** 제공.
3. **JLPT N3 단어장 & 한자(음독·훈독·예문) 학습실**
   - 실전 회화와 직결되는 N3 필수 어휘의 한자 쪼개기(훈음, 음독, 훈독, 암기 팁), 플래시카드 뒤집기, 4지선다 퀴즈 지원.
4. **종업원 접객 경어 사전 & 1초 기습 듣기 퀴즈**

---

## 🚀 GitHub Pages 배포 방법 (1분 완성)
이 프로젝트에는 GitHub Actions 자동 배포 워크플로우(`.github/workflows/deploy.yml`)와 상대 경로 빌드 설정(`base: './'`)이 이미 적용되어 있습니다.

1. GitHub에서 새 Repository(예: `speak-japanese`)를 생성합니다.
2. 터미널에서 아래 명령어로 푸시합니다:
   ```bash
   git remote add origin https://github.com/<내-깃허브-아이디>/<레포지토리-이름>.git
   git branch -M main
   git push -u origin main
   ```
3. GitHub 저장소의 **Settings → Pages** 메뉴로 이동하여 **Build and deployment > Source**를 **`GitHub Actions`**로 선택하면 자동으로 빌드 및 배포가 완료됩니다!

