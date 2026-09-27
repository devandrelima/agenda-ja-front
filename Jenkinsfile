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
        sh 'docker build --target build --tag "${IMAGE_NAME}:ci-${BUILD_NUMBER}" .'
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
      sh 'docker image prune --force --filter "label=com.agenda-ja.managed-by=jenkins" || true'
    }
  }
}
