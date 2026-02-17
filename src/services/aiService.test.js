import aiService from './aiService';

describe('aiService stub', () => {
  it('returns config missing message when env is empty', async () => {
    const result = await aiService.sendMessage('test');
    expect(result.response).toContain('Konfiguration');
  });
});
