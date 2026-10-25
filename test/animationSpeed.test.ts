import * as assert from 'node:assert/strict';
import { readAnimationSpeed } from '../src/animationSpeed';

describe('velocidade das animações', () => {
  it('aceita os valores atuais', () => {
    for (const v of ['slow', 'normal', 'fast', 'off']) assert.equal(readAnimationSpeed(v), v);
  });

  it('traduz os valores em português da 0.6.0', () => {
    assert.equal(readAnimationSpeed('lenta'), 'slow');
    assert.equal(readAnimationSpeed('rapida'), 'fast');
    assert.equal(readAnimationSpeed('desligada'), 'off');
  });

  it('valor desconhecido ou ausente vira normal', () => {
    assert.equal(readAnimationSpeed(undefined), 'normal');
    assert.equal(readAnimationSpeed('turbo'), 'normal');
    assert.equal(readAnimationSpeed(2), 'normal');
  });
});
