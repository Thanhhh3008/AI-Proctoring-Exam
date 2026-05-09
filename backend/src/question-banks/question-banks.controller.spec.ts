import { Test, TestingModule } from '@nestjs/testing';
import { QuestionBanksController } from './question-banks.controller';

describe('QuestionBanksController', () => {
  let controller: QuestionBanksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionBanksController],
    }).compile();

    controller = module.get<QuestionBanksController>(QuestionBanksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
