# _workspace — 하네스 중간 산출물

에이전트·스킬이 생성하는 **검토 로그, 변경 이력, 임시 산출물**을 모으는 작업 폴더.

## 디렉터리 컨벤션

- `agency_review_{YYYY-MM-DD}.md` — agency-guardian 검토 로그
- `pedagogy_review_{YYYY-MM-DD}.md` — pedagogy-reviewer 검토 로그
- `db_changes.md` — db-architect 스키마 변경 누적 요약
- `prompt_iterations/{feature}_{n}.md` — 프롬프트 반복 기록

## 원칙

- 본 폴더의 파일은 **개발 산출물이 아닌 메타 기록**.
- 운영 환경에 배포되지 않는다 (`.gitignore` 대상 후보).
- 학생 발화 인용 시 익명화 필수.
