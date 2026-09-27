pipeline {
  agent any
  options {
    timestamps()
    disableConcurrentBuilds()
  }
  environment {
    IMAGE_NAME = 'agenda-ja-front'
    CONTAINER_NAME = 'agenda-ja-front'
    HOST_PORT = '8092'
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build e testes') {
      steps {
        sh '''
          docker build --target build --tag "${IMAGE_NAME}:ci-${BUILD_NUMBER}" .
          artifact_container="$(docker create "${IMAGE_NAME}:ci-${BUILD_NUMBER}")"
          mkdir -p "build-artifacts/${BUILD_NUMBER}"
          docker cp "${artifact_container}:/app/coverage" "build-artifacts/${BUILD_NUMBER}/coverage"
          docker cp "${artifact_container}:/app/reports" "build-artifacts/${BUILD_NUMBER}/reports"
          docker cp "${artifact_container}:/app/dist" "build-artifacts/${BUILD_NUMBER}/dist"
          docker rm "${artifact_container}"
        '''
      }
    }
    stage('Imagem de produção') {
      steps {
        sh 'docker build --tag "${IMAGE_NAME}:${BUILD_NUMBER}" --tag "${IMAGE_NAME}:latest" .'
      }
    }
    stage('Deploy na VPS') {
      steps {
        sh '''
          docker rm --force "${CONTAINER_NAME}" 2>/dev/null || true
          docker run --detach \
            --name "${CONTAINER_NAME}" \
            --restart unless-stopped \
            --publish "${HOST_PORT}:80" \
            --label "com.agenda-ja.managed-by=jenkins" \
            "${IMAGE_NAME}:${BUILD_NUMBER}"
          docker inspect --format '{{.State.Status}}' "${CONTAINER_NAME}" | grep -x running
        '''
      }
    }
  }
  post {
    always {
      junit testResults: 'build-artifacts/*/reports/unit/junit.xml', allowEmptyResults: true
      archiveArtifacts artifacts: 'build-artifacts/**', allowEmptyArchive: true
      recordCoverage tools: [[parser: 'COBERTURA', pattern: 'build-artifacts/*/coverage/cobertura-coverage.xml']]
      publishHTML(target: [reportDir: "build-artifacts/${env.BUILD_NUMBER}/coverage", reportFiles: 'index.html', reportName: 'Cobertura frontend'])
      sh 'docker image prune --force --filter "label=com.agenda-ja.managed-by=jenkins" || true'
    }
  }
}
