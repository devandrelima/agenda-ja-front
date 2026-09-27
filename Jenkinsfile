pipeline {
  agent any
  options { timestamps() }
  environment { PUBLISH_OPTIONAL_REPORTS = 'false' }
  stages {
    stage('Checkout e ambiente') { steps { checkout scm; sh 'node --version && npm --version' } }
    stage('Instalação reproduzível') { steps { sh 'npm ci' } }
    stage('Lint') { steps { sh 'npm run lint' } }
    stage('Tipos') { steps { sh 'npm run typecheck' } }
    stage('Testes unitários e cobertura') { steps { sh 'npm run test:coverage' } }
    stage('Build de produção') { steps { sh 'npm run build' } }
    stage('E2E headless') { steps { sh 'npm run e2e' } }
  }
  post {
    always {
      junit testResults: 'reports/unit/junit.xml, reports/e2e/junit.xml', allowEmptyResults: false
      archiveArtifacts artifacts: 'coverage/**,playwright-report/**,test-results/**,reports/**,dist/**', allowEmptyArchive: true
      script {
        if (env.PUBLISH_OPTIONAL_REPORTS == 'true') {
          recordCoverage tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']]
          publishHTML(target: [reportDir: 'coverage', reportFiles: 'index.html', reportName: 'Cobertura frontend'])
          publishHTML(target: [reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'Playwright frontend'])
        }
      }
    }
  }
}
