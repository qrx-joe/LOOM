/**
 * 条件求值策略模式
 *
 * 策略模式（Strategy Pattern）定义：
 * 定义一系列算法，将它们封装起来，并且使它们可以互相替换。
 * 策略模式让算法的变化独立于使用算法的客户。
 *
 * 应用场景：
 * - 当一个系统需要动态地在几种算法中选择一种时
 * - 当一个类定义了多种行为，并且这些行为在这个类的操作中以多个条件语句出现时
 */

import { Logger } from '@nestjs/common';

/**
 * 条件策略接口
 * 所有具体策略都必须实现这个接口
 */
export interface ConditionStrategy {
  /**
   * 策略名称，用于日志和调试
   */
  readonly name: string;

  /**
   * 检查表达式是否匹配该策略
   * @param expression 条件表达式，如 "{{score}} > 10"
   */
  matches(expression: string): boolean;

  /**
   * 执行条件求值
   * @param input 输入数据
   * @param expression 条件表达式
   * @returns 求值结果：true 或 false
   */
  evaluate(input: any, expression: string): boolean;
}

/**
 * 策略执行上下文
 * 负责管理所有策略，并协调策略的执行
 */
export class ConditionContext {
  private readonly logger = new Logger(ConditionContext.name);

  // 存储所有已注册的策略
  private strategies: ConditionStrategy[] = [];

  // 默认策略（当没有匹配的策略时使用）
  private defaultStrategy: ConditionStrategy;

  constructor() {
    // 注册所有内置策略
    this.registerStrategy(new GreaterThanStrategy());
    this.registerStrategy(new LessThanStrategy());
    this.registerStrategy(new EqualStrategy());
    this.registerStrategy(new NotEqualStrategy());
    this.registerStrategy(new GreaterThanOrEqualStrategy());
    this.registerStrategy(new LessThanOrEqualStrategy());
    this.registerStrategy(new ContainsStrategy());
    this.registerStrategy(new StartsWithStrategy());
    this.registerStrategy(new EndsWithStrategy());
    this.registerStrategy(new ExistsStrategy());

    // 设置默认策略
    this.defaultStrategy = new DefaultStrategy();
  }

  /**
   * 注册新的策略
   * 支持动态扩展新的条件类型
   */
  registerStrategy(strategy: ConditionStrategy): void {
    this.strategies.push(strategy);
    this.logger.debug(`Registered condition strategy: ${strategy.name}`);
  }

  /**
   * 执行条件求值
   * 自动选择匹配的策略进行求值
   */
  evaluate(
    input: any,
    expression: string,
  ): { result: boolean; strategy: string } {
    if (!expression || expression.trim() === '') {
      this.logger.warn('Empty expression, defaulting to true');
      return { result: true, strategy: 'empty' };
    }

    // 查找匹配的策略
    const strategy = this.strategies.find((s) => s.matches(expression));

    if (strategy) {
      try {
        const result = strategy.evaluate(input, expression);
        this.logger.debug(
          `Evaluated "${expression}" with ${strategy.name}: ${result}`,
        );
        return { result, strategy: strategy.name };
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.name} failed: ${error.message}`);
        // 策略执行失败时使用默认策略
        const defaultResult = this.defaultStrategy.evaluate(input, expression);
        return { result: defaultResult, strategy: 'default(fallback)' };
      }
    }

    // 没有匹配的策略，使用默认策略
    const result = this.defaultStrategy.evaluate(input, expression);
    this.logger.debug(
      `Evaluated "${expression}" with default strategy: ${result}`,
    );
    return { result, strategy: 'default' };
  }

  /**
   * 获取所有已注册的策略名称
   * 用于调试和文档生成
   */
  getRegisteredStrategies(): string[] {
    return this.strategies.map((s) => s.name);
  }
}

// ============================================
// 具体策略实现
// ============================================

/**
 * 抽象基类：提供通用的变量提取逻辑
 */
abstract class BaseConditionStrategy implements ConditionStrategy {
  abstract readonly name: string;
  abstract matches(expression: string): boolean;
  abstract evaluate(input: any, expression: string): boolean;

  /**
   * 从输入中提取变量值
   * 支持 {{variable}} 语法
   */
  protected extractValue(input: any, varName: string): any {
    if (varName === 'input' || varName === 'START_INPUT') {
      return input.input || input;
    }
    return input[varName];
  }

  /**
   * 解析表达式中的变量和值
   * 例如："{{score}} > 10" => { varName: 'score', targetValue: 10, isReversed: false }
   * 反向："10 < {{score}}" => { varName: 'score', targetValue: 10, isReversed: true }
   */
  protected parseExpression(
    expression: string,
    operator: string,
  ): { varName: string; targetValue: any; isReversed: boolean } | null {
    // 匹配 {{variable}} operator value
    const regex = new RegExp(`\\{\\{(\\w+)\\}\\}\\s*${operator}\\s*(.+?)$`);
    const match = expression.match(regex);

    if (match) {
      return {
        varName: match[1],
        targetValue: this.parseValue(match[2].trim()),
        isReversed: false,
      };
    }

    // 尝试反向匹配：value operator {{variable}}
    const reverseRegex = new RegExp(
      `^(.+?)\\s*${operator}\\s*\\{\\{(\\w+)\\}\\}`,
    );
    const reverseMatch = expression.match(reverseRegex);

    if (reverseMatch) {
      return {
        varName: reverseMatch[2],
        targetValue: this.parseValue(reverseMatch[1].trim()),
        isReversed: true,
      };
    }

    return null;
  }

  /**
   * 解析值（数字或字符串）
   */
  private parseValue(valueStr: string): any {
    // 尝试解析为数字
    if (!isNaN(Number(valueStr))) {
      return Number(valueStr);
    }

    // 去除引号（字符串值）
    if (
      (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))
    ) {
      return valueStr.slice(1, -1);
    }

    return valueStr;
  }
}

/**
 * 大于策略：{{score}} > 10
 * 反向：10 < {{score}}（表示 score > 10）
 */
class GreaterThanStrategy extends BaseConditionStrategy {
  readonly name = 'greaterThan';

  matches(expression: string): boolean {
    return />/.test(expression) && !/>=/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '>');
    if (!parsed) return false;

    const actualValue = Number(this.extractValue(input, parsed.varName) || 0);
    const targetValue = Number(parsed.targetValue);

    // 如果是反向匹配（如 "10 < {{score}}" 被识别为大于策略），语义需要反转
    // "10 < {{score}}" 意味着 score > 10
    if (parsed.isReversed) {
      return actualValue > targetValue;
    }

    return actualValue > targetValue;
  }
}

/**
 * 小于策略：{{score}} < 10
 * 反向：10 > {{score}}（表示 score < 10）
 */
class LessThanStrategy extends BaseConditionStrategy {
  readonly name = 'lessThan';

  matches(expression: string): boolean {
    return /</.test(expression) && !/<=/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '<');
    if (!parsed) return false;

    const actualValue = Number(this.extractValue(input, parsed.varName) || 0);
    const targetValue = Number(parsed.targetValue);

    // 正常情况：{{score}} < 10，返回 actual < target
    // 反向情况：10 < {{score}} 意味着 score > 10，返回 actual > target
    if (parsed.isReversed) {
      return actualValue > targetValue;
    }

    return actualValue < targetValue;
  }
}

/**
 * 等于策略：{{name}} == "John" 或 {{score}} == 100
 */
class EqualStrategy extends BaseConditionStrategy {
  readonly name = 'equal';

  matches(expression: string): boolean {
    return /==/.test(expression) || /===/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '==');
    if (!parsed) {
      // 尝试匹配 ===
      const parsedStrict = this.parseExpression(expression, '===');
      if (!parsedStrict) return false;
      return (
        this.extractValue(input, parsedStrict.varName) ===
        parsedStrict.targetValue
      );
    }

    const actualValue = this.extractValue(input, parsed.varName);
    // 宽松相等，支持数字和字符串比较
    return actualValue == parsed.targetValue;
  }
}

/**
 * 不等于策略：{{name}} != "John"
 */
class NotEqualStrategy extends BaseConditionStrategy {
  readonly name = 'notEqual';

  matches(expression: string): boolean {
    return /!=/.test(expression) && !/!==/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '!=');
    if (!parsed) return false;

    const actualValue = this.extractValue(input, parsed.varName);
    return actualValue != parsed.targetValue;
  }
}

/**
 * 大于等于策略：{{score}} >= 60
 */
class GreaterThanOrEqualStrategy extends BaseConditionStrategy {
  readonly name = 'greaterThanOrEqual';

  matches(expression: string): boolean {
    return />=/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '>=');
    if (!parsed) return false;

    const actualValue = Number(this.extractValue(input, parsed.varName) || 0);
    const targetValue = Number(parsed.targetValue);

    return actualValue >= targetValue;
  }
}

/**
 * 小于等于策略：{{score}} <= 100
 */
class LessThanOrEqualStrategy extends BaseConditionStrategy {
  readonly name = 'lessThanOrEqual';

  matches(expression: string): boolean {
    return /<=/.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const parsed = this.parseExpression(expression, '<=');
    if (!parsed) return false;

    const actualValue = Number(this.extractValue(input, parsed.varName) || 0);
    const targetValue = Number(parsed.targetValue);

    return actualValue <= targetValue;
  }
}

/**
 * 包含策略：{{content}} contains "keyword"
 */
class ContainsStrategy extends BaseConditionStrategy {
  readonly name = 'contains';

  matches(expression: string): boolean {
    return /contains/i.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    // 匹配 {{var}} contains "value" 或 {{var}} contains 'value'
    const match = expression.match(/\{\{(\w+)\}\}\s*contains\s*["'](.+?)["']/i);
    if (!match) return false;

    const varName = match[1];
    const searchValue = match[2];
    const actualValue = String(this.extractValue(input, varName) || '');

    return actualValue.toLowerCase().includes(searchValue.toLowerCase());
  }
}

/**
 * 开头匹配策略：{{name}} startsWith "Mr"
 */
class StartsWithStrategy extends BaseConditionStrategy {
  readonly name = 'startsWith';

  matches(expression: string): boolean {
    return /startsWith/i.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const match = expression.match(
      /\{\{(\w+)\}\}\s*startsWith\s*["'](.+?)["']/i,
    );
    if (!match) return false;

    const varName = match[1];
    const prefix = match[2];
    const actualValue = String(this.extractValue(input, varName) || '');

    return actualValue.startsWith(prefix);
  }
}

/**
 * 结尾匹配策略：{{email}} endsWith "@example.com"
 */
class EndsWithStrategy extends BaseConditionStrategy {
  readonly name = 'endsWith';

  matches(expression: string): boolean {
    return /endsWith/i.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const match = expression.match(/\{\{(\w+)\}\}\s*endsWith\s*["'](.+?)["']/i);
    if (!match) return false;

    const varName = match[1];
    const suffix = match[2];
    const actualValue = String(this.extractValue(input, varName) || '');

    return actualValue.endsWith(suffix);
  }
}

/**
 * 存在性检查策略：{{name}} exists
 */
class ExistsStrategy extends BaseConditionStrategy {
  readonly name = 'exists';

  matches(expression: string): boolean {
    return /\{\{(\w+)\}\}\s*exists/i.test(expression);
  }

  evaluate(input: any, expression: string): boolean {
    const match = expression.match(/\{\{(\w+)\}\}\s*exists/i);
    if (!match) return false;

    const varName = match[1];
    const value = this.extractValue(input, varName);

    return value !== undefined && value !== null && value !== '';
  }
}

/**
 * 默认策略
 * 当没有匹配的策略时使用
 */
class DefaultStrategy implements ConditionStrategy {
  readonly name = 'default';

  matches(_expression: string): boolean {
    return true; // 默认策略总是匹配
  }

  evaluate(input: any, expression: string): boolean {
    // 简单的真值检查
    if (input[expression]) {
      return true;
    }

    // 如果表达式是 "true" 或 "false"
    if (expression.trim().toLowerCase() === 'true') return true;
    if (expression.trim().toLowerCase() === 'false') return false;

    // 默认返回 true
    return true;
  }
}
