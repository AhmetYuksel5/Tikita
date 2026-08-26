/* android/app/build.gradle'ı GERÇEKTEN çalıştırıp aldığı değerleri denetler.
 *
 * Koştur:
 *   CP=$(ls /opt/gradle/lib/groovy-*.jar | tr '\n' ':')
 *   java -cp "$CP" groovy.ui.GroovyMain scratchpad/gradlecalis.groovy
 *
 * NEDEN VAR: `groovyc` ile sözdizimi denetimi bu hata sınıfını YAKALAMAZ; hata
 * yalnız çalışırken doğar. İlk APK derlemeleri iki kez böyle düştü:
 *
 *  1) versionCode (System.getenv("...") ?: "1").toInteger()
 *     Groovy'de metot adından sonra boşluk+parantez ARGÜMAN LİSTESİDİR: önce
 *     versionCode("1") STRING ile çağrılır, `.toInteger()` o çağrının DÖNÜŞÜNE
 *     (AGP setter'ları null döner) uygulanır → "Value is null".
 *
 *  2) dependencies{} içindeki "$KOTLIN_SURUM" gibi değişkenler kapsam dışında
 *     kalırsa sessizce "null" olur ve bağımlılık koordinatı bozulur.
 *
 * Bu betik AGP'nin DSL'ini taklit eder (setter'lar null döner — 1. tuzağın
 * kaynağı birebir korunur), dosyanın TAMAMINI çalıştırır (def satırları dâhil;
 * eskiden `android {`'ten öncesi kesiliyordu ve ksVar/KOTLIN_SURUM hiç
 * tanımlanmıyordu) ve hem alan tiplerini hem bağımlılık koordinatlarını denetler.
 * build.gradle'a dokununca koştur.
 */
class Kayitci {
  def gelen = [:]
  def liste = []
  def methodMissing(String ad, args) {
    def a = args.length == 1 ? args[0] : args.toList()
    if (a instanceof Closure) { a.delegate = this; a.resolveStrategy = Closure.DELEGATE_FIRST; a(); return null }
    gelen[ad] = a
    liste << [ad, a]
    return null                      // AGP setter'ları null döner — 1. tuzağın kaynağı
  }
  def propertyMissing(String ad, v) { gelen[ad] = v; null }
  def propertyMissing(String ad) { null }
}

def androidK = new Kayitci()         // android { } bloğu
def bagimlilik = new Kayitci()       // dependencies { } bloğu
def eklenti = new Kayitci()          // plugins { } bloğu

def yol = new File("android/app/build.gradle")
if (!yol.exists()) { println "bulunamadı: " + yol; System.exit(1) }

def onsoz = """
def plugins(Closure c){ c.delegate = binding.variables.EK;  c.resolveStrategy = Closure.DELEGATE_FIRST; c() }
def android(Closure c){ c.delegate = binding.variables.AND; c.resolveStrategy = Closure.DELEGATE_FIRST; c() }
def dependencies(Closure c){ c.delegate = binding.variables.BAG; c.resolveStrategy = Closure.DELEGATE_FIRST; c() }
def file(p){ new File(String.valueOf(p)) }
def JavaVersion = [VERSION_17: "17"]
"""

try {
  new GroovyShell(new Binding([EK: eklenti, AND: androidK, BAG: bagimlilik]))
    .evaluate(onsoz + yol.text)
} catch (e) {
  println "✗ build.gradle ÇALIŞIRKEN PATLADI: " + e.getClass().simpleName + ": " + e.message
  System.exit(1)
}

def hata = 0
def bekle = { ad, tip ->
  def v = androidK.gelen[ad]
  if (v == null) { println "  ✗ " + ad + " hiç ayarlanmadı"; hata = 1; return }
  if (!tip.isInstance(v)) { println "  ✗ " + ad + " " + tip.simpleName + " olmalı, " + v.getClass().simpleName + " geldi (" + v + ")"; hata = 1; return }
  println "  ✓ " + ad + " = " + v + " (" + v.getClass().simpleName + ")"
}

println "android{} bloğu çalıştı:"
bekle("versionCode", Integer)        // 1. tuzak
bekle("versionName", String)
bekle("compileSdk", Integer)
bekle("minSdk", Integer)
bekle("targetSdk", Integer)
bekle("applicationId", String)
bekle("namespace", String)

println "\ndependencies{} koordinatları:"
// DİKKAT: "a:b:$SURUM" bir GString'dir, String DEĞİL — `instanceof String` ile
// süzülürse tam da denetlemek istediğimiz interpolasyonlu satırlar elenir.
def koordinatlar = bagimlilik.liste.findAll { it[1] instanceof CharSequence }
                                   .collect { it[1].toString() }
if (!koordinatlar) { println "  ✗ hiç bağımlılık okunmadı"; hata = 1 }
koordinatlar.each { k ->
  // 2. tuzak: kapsam dışı değişken "null"a dönüşür, boş sürüm de bozuktur
  if (k.contains("null") || k.endsWith(":") || k.count(":") != 2) {
    println "  ✗ BOZUK koordinat: " + k; hata = 1
  } else {
    println "  ✓ " + k
  }
}

// kotlin-stdlib ikilenmesine karşı kısıt duruyor mu (bkz. build.gradle notu)
["kotlin-stdlib-jdk7", "kotlin-stdlib-jdk8"].each { a ->
  if (!koordinatlar.any { it.contains(a) }) {
    println "  ✗ " + a + " kısıtı YOK — kotlin stdlib sınıfları ikilenip derleme düşer"; hata = 1
  }
}

println(hata ? "\n✗ HATA VAR" : "\n✓ build.gradle çalışma denetimi geçti")
System.exit(hata)
