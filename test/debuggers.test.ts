import * as assert from 'node:assert/strict';
import { missingDebugger } from '../src/debuggers';

describe('debugger que falta', () => {
  it('sugere a extensão da linguagem', () => {
    assert.equal(missingDebugger('C:/a/Main.JAVA', () => false)?.install, 'vscjava.vscode-java-pack');
    assert.equal(missingDebugger('/a/main.go', () => false)?.label, 'Go');
  });

  it('não avisa quando já tem, nem para JavaScript', () => {
    assert.equal(missingDebugger('/a/Main.java', () => true), undefined);
    assert.equal(missingDebugger('/a/main.js', () => false), undefined);
    assert.equal(missingDebugger('', () => false), undefined);
  });

  it('num fork, o debugger aberto resolve', () => {
    assert.equal(missingDebugger('/a/Main.cs', (id) => id === 'muhammad-sammy.csharp'), undefined);
  });
});
