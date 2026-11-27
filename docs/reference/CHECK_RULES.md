# 점검 항목과 판정 규칙

이 문서는 `egov_check_compliance` 도구가 무엇을 어떤 규칙으로 판정하는지 설명합니다. 점검 결과의 형식은 [REPORT_FORMAT.md](./REPORT_FORMAT.md)에서 다룹니다.

판정은 모두 서버 코드가 정해진 규칙에 따라 수행합니다. LLM 은 결과를 해석하고 요약하는 역할만 맡으므로, 같은 프로젝트를 점검하면 항상 같은 결과가 나옵니다. 점검은 빌드 도구를 실행하지 않고 파일을 텍스트로 읽는 정적 분석이어서, 아래에 적은 인식 범위 밖의 코드는 실제 동작과 다르게 판정될 수 있습니다.

## 점검 대상

| 영역 | 대상 파일 | 판정 단위 |
|------|-----------|-----------|
| Project (빌드 파일) | `pom.xml`, `build.gradle`, `build.gradle.kts` | 모듈(빌드 파일)과 프로젝트 전체 |
| Controller | `*Controller.java` | 파일 |
| Service | `*ServiceImpl.java` | 파일 |
| DAO / Mapper | `*DAO.java`, `*Dao.java`, `*Mapper.java` | 파일 |

파일은 다음 규칙으로 수집합니다.

- 파일 이름의 접미어로 고르며, 대소문자를 구분합니다. 접미어가 다른 클래스(예: `*Ctrl.java`, `*ServiceImplV2.java`)는 점검 대상에서 빠집니다.
- 이름이 `.` 으로 시작하는 디렉토리와, 이름이 `node_modules`, `target`, `build`, `out`, `dist` 인 디렉토리는 깊이와 관계없이 건너뜁니다. 그래서 `egov/build/` 처럼 같은 이름을 쓰는 Java 패키지 디렉토리도 건너뜁니다.
- `src/test`, `src/it` 아래의 파일은 수집하지 않습니다. 테스트용 클래스가 판정과 Controller 의 "DAO X" 판정에 섞이지 않게 하기 위해서입니다.
- 심볼릭 링크는 따라가지 않습니다.
- `.gitignore` 와 `.ignore` 의 내용과 관계없이 수집합니다.

점검은 Project, DAO / Mapper, 데이터 접근 설정 정보, Controller, Service 의 순서로 진행합니다. Project 에서 판정한 실행환경 세대가 DAO / Mapper 의 Version 체크에 쓰이고, DAO / Mapper 의 판정 대상 타입 이름이 Controller 의 "DAO X" 체크에 쓰이기 때문입니다.

## Project (빌드 파일)

| 항목 | 내용 |
|------|------|
| 실행환경 세대와 버전 | 모듈(`pom.xml`, `build.gradle`, `build.gradle.kts`)마다 세대(3.x / 4.x / 5.x)와 버전을 판정하고, 근거의 종류(source)와 내용(evidence)을 함께 보고합니다. |
| 필수 라이브러리 4종 | `ptl-mvc`, `fdl-cmmn`, `fdl-logging`, `psl-dataaccess` 가 모듈에 적용되어 있는지 판정합니다. 판정하지 않는 모듈을 뺀 **모든 모듈에 적용**합니다. |
| 버전 일관성 | 실행환경 의존성의 버전이 하나로 모이는지 판정합니다. |
| 데이터 접근 설정 정보 | 스프링의 데이터 접근 설정이 있는지 모읍니다. **정보 항목이며 판정에 영향을 주지 않습니다.** |
| 미분류 데이터 접근 파일 | DAO / Mapper 의 수집 대상이 아닌데 데이터 접근 타입을 직접 쓰는 파일을 모읍니다. 정보 항목입니다. |

### 판정하지 않는 모듈 (Skipped)

다음 빌드 파일은 판정하지 않고 `Skipped` 로 둡니다.

- `packaging` 이 `pom` 인 Maven 모듈 (집계 모듈과 parent 전용 pom)
- 같은 디렉토리의 `settings.gradle` 또는 `settings.gradle.kts` 에 `include` 가 있는 Gradle 루트 빌드 파일
- `buildSrc` 의 빌드 파일
- 읽을 수 없는 빌드 파일

### 실행환경 세대와 버전

세대와 버전은 다음 순서로 근거를 찾아서 판정합니다. 결과에는 근거의 종류가 source 값으로 표시됩니다.

| source | 근거 |
|--------|------|
| `property` | 버전 속성 (`egovframe.rte.version`, `org.egovframe.rte.version`, `egovframework.rte.version`) |
| `bom` | BOM (parent 또는 import). `egovframe-web-config-parent`, `egovframe-boot-starter-parent`, `org.egovframe.boot.starter.parent` 를 인식하고, 그 버전을 실행환경 버전으로 봅니다. |
| `dependency-version` | 실행환경 의존성에 적힌 버전 |
| `artifact-pattern` | 실행환경 아티팩트의 이름 패턴 |
| `manual` | `runtimeGeneration` 파라미터로 지정한 세대 |
| `none` | 근거를 찾지 못함 |

- 실행환경 아티팩트는 artifactId 의 접두어로 인식합니다: `egovframework.rte.`(3.x), `org.egovframe.rte.`(4.x), `egovframe-rte-`(5.x).
- 아티팩트 접두어가 가리키는 세대와 버전이 가리키는 세대가 다르거나 서로 다른 세대의 아티팩트가 섞여 있으면, 세대는 `unknown` 이 되고 버전 일관성이 `FAIL` 이 됩니다.
- `runtimeGeneration` 을 지정하면 모든 모듈의 세대가 지정한 값으로 바뀝니다. 빌드 파일이 없거나 세대를 판정할 수 없는 프로젝트에서도 이 파라미터로 DAO / Mapper 의 Version 체크를 켤 수 있습니다.

### 필수 라이브러리 4종

| 상태 | 뜻 | 실패 여부 |
|------|-----|-----------|
| `direct` | 모듈이 직접 선언함. 프로젝트 안의 다른 모듈에 대한 의존을 거쳐 들어온 선언도 `direct` 로 봅니다. | 통과 |
| `transitive` | 선언한 실행환경 모듈의 전이 의존으로 도달함. 도달 경로가 `via ptl-mvc > fdl-cmmn` 형태로 표시됩니다. | 통과 |
| `excluded` | 전이 의존으로 도달하지만 exclusion 으로 끊김 | 실패 |
| `missing` | 선언도 전이 도달도 없음 | 실패 |
| `unknown` | 해석할 수 없어 `missing` 이나 `excluded` 로 단정할 수 없음. `org.egovframe.cloud` 또는 `egovframework.com.ems` 그룹의 아티팩트를 선언했거나, Gradle 의 번들, 루프, 헬퍼 함수처럼 읽지 못한 선언이 있는 경우입니다. | 실패로 세지 않음 |

전이 의존은 빌드 도구로 해석하지 않고, 서버에 내장한 **실행환경 모듈 의존 그래프**로 판정합니다. 이 그래프는 실행환경 브랜치별 모듈 `pom.xml` 의 compile 의존을 추출한 것이며, 버전에 따라 다음 브랜치의 그래프를 씁니다.

| 세대 | 브랜치 선택 |
|------|-------------|
| 3.x | 버전이 `3.9.` 로 시작하면 3.9.x, 그 밖에는 3.10.x |
| 4.x | 버전이 `4.0.`, `4.1.`, `4.2.` 로 시작하면 해당 브랜치, 그 밖에는 4.3.x |
| 5.x | 버전이 `5.1.` 로 시작하면 5.1.x, 그 밖에는 5.0.x |
| 세대를 모름 | 3.10.x, 4.3.x, 5.0.x, 5.1.x 를 합친 그래프 |

5.1.x 그래프는 5.1.0 **베타**에서 추출한 것입니다. 필수 라이브러리 4종에 도달하는 경로는 5.0.x 그래프와 같습니다.

빌드 파일의 해석 범위는 다음과 같습니다.

- 프로젝트 밖에 있는 parent POM 과 BOM 은 읽지 않습니다. 그곳에서만 선언된 의존성은 `missing` 으로 판정됩니다.
- Maven 은 scope 가 `compile`, `runtime`, `provided` 이고 optional 이 아닌 의존성만 봅니다. 기본으로 활성화되지 않는 profile 의 의존성은 보지 않습니다.
- Gradle 은 `implementation`, `api`, `compile`, `runtimeOnly`, `compileOnly` 구성의 의존성만 봅니다.
- `org.egovframe.boot` 그룹의 `egovframe-boot-starter-*` 는 실행환경 모듈을 끌어오는 것으로 보지 않습니다. 이 스타터만 선언한 모듈은 필수 라이브러리가 `missing` 으로 판정됩니다.
- 프로젝트 안의 parent 체인, 모듈 사이의 의존, Gradle 의 `apply from` 은 각각 5단계까지 따라갑니다.

### 모듈과 프로젝트의 결과

| 결과 | 뜻 |
|------|-----|
| `OK` | 필수 라이브러리 4종이 모두 `direct` 또는 `transitive` |
| `NotFound` | 필수 라이브러리 가운데 `missing` 이나 `excluded` 가 있음 |
| `Unknown` | `missing` 과 `excluded` 는 없지만 `unknown` 이 있어 판정하지 못함. 실패로 세지 않습니다. |
| `Skipped` | 판정하지 않는 모듈 |

- 프로젝트 전체의 결과는 모듈의 결과가 모두 `OK` 여도 버전 일관성이 `FAIL` 이면 `NotFound` 입니다. 판정할 수 있는 모듈이 하나도 없으면 `Unknown` 입니다.
- 버전 일관성은 `PASS`, `FAIL`, `n/a` 가운데 하나입니다. 판정하지 않는 모듈을 뺀 모든 모듈의 실행환경 의존성에서 해석한 버전을 비교하므로, 한 모듈 안에서 버전이 갈려도 `FAIL` 입니다.
- 배치나 MSA 템플릿처럼 필수 라이브러리 4종을 모두 쓰지 않는 모듈은, 빠진 라이브러리가 근거와 함께 `NotFound` 로 표시될 수 있습니다.

### 데이터 접근 설정 정보

설정 파일과 Java 소스, 빌드 파일에서 다음 설정이 있는지 찾습니다. 설정의 **존재 여부**만 모으는 정보 항목이며 판정에는 넣지 않습니다.

| 종류 (kind) | 찾는 것 |
|-------------|---------|
| `sqlMapClientFactoryBean` | XML 의 bean class 가 `.SqlMapClientFactoryBean` 으로 끝나는 것, Java 소스의 `SqlMapClientFactoryBean` |
| `sqlSessionFactoryBean` | XML 의 bean class 가 `org.mybatis.spring.SqlSessionFactoryBean` 인 것, Java 소스의 `SqlSessionFactoryBean` |
| `mapperConfigurer` | XML 의 bean class 가 `psl.dataaccess.mapper.MapperConfigurer` 로 끝나는 것, Java 소스의 `MapperConfigurer` 또는 `MapperScannerConfigurer` |
| `mapperScan` | Java 소스의 `@MapperScan`, `@MapperScans` |
| `mybatisStarter` | 빌드 파일의 `mybatis-spring-boot-starter` |
| `mapperLocations` | yml 의 `mybatis` 아래 `mapper-locations`, properties 의 `mybatis.mapper-locations` |

- 설정 파일은 경로에 `src/main/resources` 또는 `src/main/webapp/WEB-INF` 가 들어 있는 `*.xml`, `*.yml`, `*.yaml`, `*.properties` 를 보고, Java 소스는 `src/main/java` 아래의 파일을 봅니다.
- XML 에 선언한 MyBatis-Spring 의 `MapperScannerConfigurer` bean 과 `<mybatis:scan>` 은 인식하지 못합니다. 이 방식으로만 스캔을 설정한 프로젝트에서는 아래의 첫 번째 경고가 표시될 수 있습니다.

찾은 설정이 DAO / Mapper 판정과 엇갈리면 교차 경고로 표시합니다.

- Mapper 인터페이스가 있는데 `MapperConfigurer`, `@MapperScan`, `mybatis-spring-boot-starter` 가 모두 없음
- iBatis DAO 가 있는데 `SqlMapClientFactoryBean` 이 없음
- Spring 의 iBatis 지원 패키지(`org.springframework.orm.ibatis`)의 `SqlMapClientFactoryBean` 을 쓰는데 실행환경이 4.x, 5.x 이거나 3.5 이상임
- `mybatis-spring-boot-starter` 만 있고 `MapperConfigurer` 와 `@MapperScan` 이 없는데 Mapper 인터페이스가 있음
- `@MapperScan` 에 `annotationClass` 가 없음

### 미분류 데이터 접근 파일

DAO / Mapper 의 수집 대상(`*DAO.java`, `*Dao.java`, `*Mapper.java`)이 아닌 Java 파일 가운데 `SqlSessionTemplate`, `SqlMapClient`, `JdbcTemplate`, `NamedParameterJdbcTemplate`, `EntityManager` 를 직접 쓰는 파일을 목록으로 보여 줍니다. `*Controller.java` 나 `*ServiceImpl.java` 도 이 목록에 나올 수 있습니다. 정보 항목입니다.

## Controller

대상은 `*Controller.java` 입니다. 세 체크를 모두 통과해야 통과입니다.

| 체크 | 조건 |
|------|------|
| check1: `@Controller` | 파일에 `@Controller` 또는 `@RestController` 가 있음 |
| check2: 매핑 어노테이션 | 클래스 레벨 `@RequestMapping` 이 있거나, public 메서드 가운데 **1개 이상**에 매핑 어노테이션이 있음 |
| check3: DAO X | `*DAO`, `*Dao` 타입이나 DAO / Mapper 레이어의 판정 대상인 `*Mapper` 타입을 선언해서 쓰지 않음 |

- 매핑 어노테이션은 `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` 입니다. 클래스 레벨로 인정하는 것은 `@RequestMapping` 하나입니다.
- check2 는 메서드 단위로 집계되어, 결과에 매핑된 메서드 수와 전체 public 메서드 수가 실립니다(예: `mapping annotation on 0/1 public methods`). public 생성자도 전체 수에 들어갑니다. 일부 메서드에만 매핑이 있어도 통과하며, 이때 CSV 에는 `a/b` 로 표시됩니다. public 메서드가 하나도 없으면 클래스 레벨 `@RequestMapping` 이 있어야 통과합니다.
- 텍스트 리포트의 `Check:` 줄은 이 조건을 `on every public method` 로 적고 있지만, 실제 판정 기준은 위와 같이 1개 이상입니다.
- check3 은 `@Autowired` 나 `@Resource` 가 붙었는지를 보지 않고 타입의 선언을 봅니다. 필드, 생성자와 메서드의 매개변수, 지역 변수로 선언한 타입의 이름이 `DAO` 또는 `Dao` 로 끝나면 위반입니다. `*Mapper` 타입은 `ObjectMapper` 같은 라이브러리 타입을 DAO 로 잘못 보지 않도록, DAO / Mapper 레이어의 판정 대상에 같은 이름이 있을 때만 위반으로 봅니다. `List<SampleDAO>` 처럼 제네릭 인자로만 쓴 타입은 찾지 못합니다.
- `abstract` 클래스는 점검 대상에서 제외하며, 총 파일 수와 Skipped 수에도 들어가지 않습니다.

Controller 와 Service 의 판정은 소스를 줄 단위로 읽는 방식이어서 다음과 같은 특성이 있습니다.

- 어노테이션은 주석이 아닌 줄에 그 문자열이 있는지로 판정합니다. 그래서 `@ControllerAdvice` 만 있는 파일도 check1 을 통과합니다.
- 클래스 레벨 `@RequestMapping` 은 `class` 선언과 `{` 가 같은 줄에 있고, 그 줄의 위쪽 10줄 안에 어노테이션이 있을 때 인식합니다. `{` 를 다음 줄에 쓰는 코드에서는 클래스 레벨 매핑을 인식하지 못할 수 있습니다.
- 메서드의 매핑 어노테이션은 메서드 선언의 위쪽 15줄 안에서 찾습니다.

## Service

대상은 `*ServiceImpl.java` 입니다. 세 체크를 모두 통과해야 통과입니다.

| 체크 | 조건 |
|------|------|
| check1: 기반 클래스 | `EgovAbstractServiceImpl` 을 상속함 (직접 상속하거나 중간 클래스를 거쳐 상속. 최대 5단계까지 추적) |
| check2: `@Service` | 파일에 `@Service` 가 있음 |
| check3: 인터페이스 구현 | 클래스 선언부의 `implements` 목록에 `*Service` 인터페이스가 있음 |

- 표준프레임워크의 기반 클래스를 상속하지 않고 Spring 표준만 따르는 `*ServiceImpl` 클래스는 check1 실패로 보고됩니다.
- `abstract` 클래스는 점검 대상에서 제외하며, 총 파일 수와 Skipped 수에도 들어가지 않습니다.

## DAO / Mapper

대상은 `*DAO.java`, `*Dao.java`, `*Mapper.java` 입니다. 파일 이름이 아니라 **파일 내용**으로 구현 방식(Style)을 분류한 뒤 세 항목을 판정합니다. 공식 적용점검 가이드의 DAO 항목이 iBatis DAO, MyBatis DAO, Mapper 인터페이스 가운데 하나를 택하도록 되어 있어서, 세 방식을 한 레이어로 함께 점검합니다.

통과 조건은 "Base 통과, Bean 통과, Version 이 실패가 아님" 입니다. Version 을 판정하지 않은 경우(`n/a`)는 실패로 보지 않습니다.

| 구현 방식 (Style) | 분류 기준 | Base (check1) | Bean (check2) | Version (check3) |
|-------------------|-----------|---------------|---------------|------------------|
| iBatis DAO | 상속 체인의 끝이 `EgovAbstractDAO` 인 클래스 | 상속 체인이 기반 클래스에 도달함 (중간 클래스를 거쳐도 됨) | `@Repository` 가 있음 (기반 클래스를 프로젝트 안에 복사해서 쓴 경우는 실패) | 기반 클래스의 패키지가 세대와 일치함 (3.x 는 `egovframework.rte.psl.dataaccess`, 4.x 와 5.x 는 `org.egovframe.rte.psl.dataaccess`) |
| MyBatis DAO | 상속 체인의 끝이 `EgovAbstractMapper` 인 클래스 | iBatis DAO 와 같음 | iBatis DAO 와 같음 | iBatis DAO 와 같음 |
| Mapper IF | 인터페이스 (Spring Data 저장소와 MapStruct 매퍼는 제외) | `@Mapper` 또는 `@EgovMapper` 가 있음 | 어노테이션의 import 출처가 표준프레임워크 패키지임 (MyBatis 의 `org.apache.ibatis.annotations.Mapper` 는 실패) | 어노테이션의 이름과 패키지가 세대와 일치함 (5.x 는 `@EgovMapper`, 3.x 와 4.x 는 `@Mapper`) |

- 인터페이스는 어노테이션이 없어도 Mapper IF 로 분류되고, 이때 Base 와 Bean 이 실패합니다.
- 기반 클래스에 도달하지 못한 **클래스**는 구현 방식을 정하지 못해 결과에 `no style` 로 집계되고, Base 가 실패합니다. 표준프레임워크의 기반 클래스를 상속하지 않고 `@Repository` 만 붙인 `*DAO` 클래스가 여기에 해당합니다.
- 상속 체인은 중간 클래스 5개까지 추적합니다. 그보다 깊거나, 이름이 같은 클래스가 여럿이어서 부모를 정할 수 없으면 Base 가 실패합니다.
- 중간 클래스를 거친 상속은 `package` 선언을 기준으로 만든 FQCN 색인으로 추적합니다. 그래서 이름이 같은 다른 패키지의 클래스나 주석 안의 `extends` 를 잘못 읽지 않습니다.
- 기반 클래스는 `EgovAbstractDAO`, `EgovAbstractMapper` 라는 이름으로 인식합니다.

Version 체크는 다음 경우에 `n/a` 가 되어 판정에 들어가지 않습니다.

- 실행환경 세대를 알 수 없는 경우. 세대는 파일이 속한 모듈의 것을 씁니다. 속한 모듈의 세대가 `unknown` 이면 프로젝트의 세대로 대체하지 않으며, 속한 모듈이 없을 때에만 프로젝트의 세대를 씁니다.
- 기반 클래스나 어노테이션의 import 출처를 표준프레임워크 패키지로 해석하지 못한 경우 (import 가 없음, 프로젝트 안의 복사본을 씀 등)
- Mapper IF 에서 Bean 이 실패한 경우

### 판정에서 빼는 파일 (Skipped)

다음 파일은 판정하지 않고, 결과의 Skipped 목록에 사유와 함께 표시합니다.

| 사유 (reason) | 대상 |
|---------------|------|
| `abstract` | `abstract` 클래스 (상속한 하위 클래스로 판정) |
| `configuration` | `@Configuration` 이 붙은 클래스 |
| `not-data-access` | 표준프레임워크 기반 클래스도 스테레오타입 어노테이션(`@Repository`, `@Component`, `@Service`)도 없는 `*Mapper` 클래스 (`RowMapper` 구현처럼 데이터 접근 계층이 아닌 Mapper) |
| `spring-data` | Spring Data 저장소 인터페이스 (`JpaRepository` 등을 상속) |
| `mapstruct` | MapStruct 의 `@Mapper` 인터페이스 |
| `base-class` | `@Repository` 없이 다른 수집 파일의 부모로만 쓰이는 기반 클래스 (하위 클래스로 판정) |
| `not-a-class` | 타입 선언이 없거나 enum, record, `@interface` 인 파일 |
| `unreadable` | 읽을 수 없는 파일 |

## 한계

- 점검 범위는 **Java 소스와 표준프레임워크의 어노테이션·기반 클래스**로 한정됩니다. Kotlin 이나 Groovy 소스는 점검하지 않습니다.
- Mapper XML 의 SQL 내용은 점검하지 않습니다. 설정 파일(XML, yml, properties, Java Config)과 빌드 파일에서는 데이터 접근 설정의 **존재 여부**만 정보 항목으로 모으며 판정에 넣지 않습니다.
- 빌드 파일은 빌드 도구를 실행하지 않고 텍스트로 읽습니다. Gradle 은 일반적인 선언 형태만 인식하고, 번들, 루프, 헬퍼 함수, conventions 플러그인처럼 해석이 확실하지 않은 형태는 추측하지 않고 `unknown` 으로 남깁니다.
- 전이 의존은 내장한 실행환경 모듈 의존 그래프(3.9.x, 3.10.x, 4.0.x, 4.1.x, 4.2.x, 4.3.x, 5.0.x, 5.1.x)로 판정합니다. 5.1.x 그래프는 5.1.0 베타 기준이며, 그래프에 없는 버전은 같은 세대의 기본 브랜치(3.10.x, 4.3.x, 5.0.x)로 판정합니다.
- 점검은 **정적 분석**입니다. 런타임에 Bean 이 실제로 등록되는지, 트랜잭션 전파가 올바른지는 판정하지 않습니다.
- Controller 와 Service 는 소스를 줄 단위로 읽어서 판정하므로, 위 Controller 절에 적은 코드 형식에서는 어노테이션을 인식하지 못할 수 있습니다.
