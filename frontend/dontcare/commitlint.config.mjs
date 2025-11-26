export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    // Preserve conventional defaults while customizing header parsing.
    name: 'conventional-changelog-conventionalcommits',
    parserOpts: {
      // Allow optional breaking "!" after type; keep it out of the captured type.
      headerPattern: /^<([A-Z]{2,3})> (\w+)(!)?: (.+)$/,
      headerCorrespondence: ['scope', 'type', 'breaking', 'subject'],
    },
  },
  rules: {
    'scope-enum': [2, 'always', ['FE', 'BE', 'AI']],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'perf', 'chore'],
    ],
    // 제목은 한글 명사형으로 끝나므로, 영문 대소문자 규칙은 비활성화합니다.
    'subject-case': [0, 'never'],
    // 제목 끝에 마침표를 사용하지 않는 규칙입니다.
    'subject-full-stop': [2, 'never', '.'],
  },
};
