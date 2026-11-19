import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Os `findBy*` e `waitFor` esperam 1 s por padrão, pouco para o build lento do Jenkins.
configure({ asyncUtilTimeout: 5000 })
