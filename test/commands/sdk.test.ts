import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('sdk', () => {
  it('runs sdk cmd', async () => {
    const {stdout} = await runCommand('sdk')
    expect(stdout).to.contain('hello world')
  })

  it('runs sdk --name oclif', async () => {
    const {stdout} = await runCommand('sdk --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
