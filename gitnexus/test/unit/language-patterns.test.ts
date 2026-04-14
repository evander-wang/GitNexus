import { describe, it, expect } from 'vitest';
import { PATTERNS, getPatternsForLanguage } from '../../src/core/embeddings/language-patterns.js';

describe('language-patterns', () => {
  describe('getPatternsForLanguage', () => {
    it('returns patterns for known languages', () => {
      expect(getPatternsForLanguage('typescript')).toBeDefined();
      expect(getPatternsForLanguage('python')).toBeDefined();
      expect(getPatternsForLanguage('rust')).toBeDefined();
    });

    it('returns undefined for unknown language', () => {
      expect(getPatternsForLanguage('brainfuck')).toBeUndefined();
    });
  });

  describe('TypeScript/JavaScript', () => {
    const patterns = PATTERNS['typescript']!;

    it('extracts method names', () => {
      const content = `class Foo {
  async getData(): Promise<T> { }
  handleClick(event: Event) { }
  private _internal() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['getData', 'handleClick', '_internal']));
    });

    it('extracts property names', () => {
      const content = `class Foo {
  private name: string;
  public age: number;
  readonly id: string;
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'age', 'id']));
    });
  });

  describe('Python', () => {
    const patterns = PATTERNS['python']!;

    it('extracts method names', () => {
      const content = `class User:
    def __init__(self, name):
        self.name = name

    def get_full_name(self):
        return self.name

    @staticmethod
    def from_dict(data):
        return User(data["name"])
`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['__init__', 'get_full_name', 'from_dict']));
    });

    it('extracts property names', () => {
      const content = `class User:
    def __init__(self, name):
        self.name = name
        self._email = ""
        self.age = 0
`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', '_email', 'age']));
    });
  });

  describe('Java', () => {
    const patterns = PATTERNS['java']!;

    it('extracts method names', () => {
      const content = `public class Service {
    public String getName() { }
    private void process(Data d) { }
    static Builder builder() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['getName', 'process', 'builder']));
    });

    it('extracts property names', () => {
      const content = `public class Service {
    private String name;
    protected int count;
    public static final int MAX = 100;
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'count']));
    });
  });

  describe('Kotlin', () => {
    const patterns = PATTERNS['kotlin']!;

    it('extracts method names', () => {
      const content = `class User(val name: String) {
    fun greet(): String = "Hello"
    suspend fun fetchData() { }
    private fun validate() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['greet', 'fetchData', 'validate']));
    });

    it('extracts property names', () => {
      const content = `class User {
    val name: String
    var age: Int = 0
    private val _id: UUID
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'age', '_id']));
    });
  });

  describe('Go', () => {
    const patterns = PATTERNS['go']!;

    it('extracts no methods (Go methods are external to struct)', () => {
      const content = `type User struct {
    Name string
    Age  int
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual([]);
    });

    it('extracts struct fields', () => {
      const content = `type User struct {
    Name string
    Age  int
    json string
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['Name', 'Age']));
    });
  });

  describe('Rust', () => {
    const patterns = PATTERNS['rust']!;

    it('extracts method names from impl block', () => {
      const content = `impl User {
    pub fn new(name: &str) -> Self { }
    fn validate(&self) -> bool { }
    pub async fn fetch(&self) -> Result<Data> { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['new', 'validate', 'fetch']));
    });

    it('extracts struct fields', () => {
      const content = `struct User {
    name: String,
    age: u32,
    active: bool,
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'age', 'active']));
    });
  });

  describe('C#', () => {
    const patterns = PATTERNS['csharp']!;

    it('extracts method names', () => {
      const content = `public class Service {
    public async Task<T> QueryAsync() { }
    private void Process() { }
    public static Service Create() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['QueryAsync', 'Process', 'Create']));
    });

    it('extracts property names', () => {
      const content = `public class Service {
    public string Name { get; set; }
    private int _count;
    public bool IsActive { get; }
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['Name', '_count', 'IsActive']));
    });
  });

  describe('PHP', () => {
    const patterns = PATTERNS['php']!;

    it('extracts method names', () => {
      const content = `class UserService {
    public function find($id) { }
    private function validate($data) { }
    public static function create(array $data) { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['find', 'validate', 'create']));
    });

    it('extracts property names', () => {
      const content = `class UserService {
    private string $name;
    public int $age;
    protected array $data = [];
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'age', 'data']));
    });
  });

  describe('Ruby', () => {
    const patterns = PATTERNS['ruby']!;

    it('extracts method names', () => {
      const content = `class User
  def initialize(name)
    @name = name
  end

  def full_name
    @name
  end

  def self.find(id)
  end
end`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['initialize', 'full_name', 'find']));
    });

    it('extracts property names', () => {
      const content = `class User
  attr_accessor :name, :email
  attr_reader :id
  attr_writer :status

  def initialize(name)
    @name = name
    @secret = "hidden"
  end
end`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'email', 'id', 'status']));
    });
  });

  describe('Swift', () => {
    const patterns = PATTERNS['swift']!;

    it('extracts method names', () => {
      const content = `class UserService {
    func fetch() async throws -> [User] { }
    private func validate(_ input: String) -> Bool { }
    static func create() -> UserService { }
    class func shared() -> Self { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['fetch', 'validate', 'create', 'shared']));
    });

    it('extracts property names', () => {
      const content = `class UserService {
    var name: String
    let id: UUID
    private var _cache: [String: Any]
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'id', '_cache']));
    });
  });

  describe('C/C++', () => {
    const patterns = PATTERNS['cpp']!;

    it('extracts method names from class body', () => {
      const content = `class Engine {
public:
    void start();
    virtual void stop();
    static Engine* create();
private:
    bool validate();
};`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['start', 'stop', 'create', 'validate']));
    });

    it('extracts member variables', () => {
      const content = `class Engine {
    std::string name;
    int power;
    bool active;
};`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'power', 'active']));
    });
  });

  describe('Dart', () => {
    const patterns = PATTERNS['dart']!;

    it('extracts method names', () => {
      const content = `class Repository {
  Future<void> save(User user) async { }
  User? findById(int id) { }
  static Repository create() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['save', 'findById', 'create']));
    });

    it('extracts property names', () => {
      const content = `class Repository {
  final String name;
  int? count;
  late List<User> users;
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', 'count', 'users']));
    });
  });

  describe('JavaScript', () => {
    const patterns = PATTERNS['javascript']!;

    it('extracts method names', () => {
      const content = `class Handler {
  async process(event) { }
  validate(input) { }
  static create() { }
}`;
      const methods = patterns.extractMethods(content);
      expect(methods).toEqual(expect.arrayContaining(['process', 'validate', 'create']));
    });

    it('extracts property names from constructor assignments', () => {
      const content = `class Handler {
  constructor() {
    this.name = "";
    this._cache = new Map();
    this.count = 0;
  }
}`;
      const props = patterns.extractProperties(content);
      expect(props).toEqual(expect.arrayContaining(['name', '_cache', 'count']));
    });
  });
});
