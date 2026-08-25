/* android/app/build.gradle'ı GERÇEKTEN çalıştırıp aldığı değerlerin tipini denetler.
 *
 * Koştur:
 *   CP=$(ls /opt/gradle/lib/groovy-*.jar | tr '\n' ':')
 *   java -cp "$CP" groovy.ui.GroovyMain scratchpad/gradlecalis.groovy
 *
 * NEDEN VAR: `groovyc` ile sözdizimi denetimi bu hata sınıfını YAKALAMAZ.
 * 2026-08-25'te ilk APK derlemesi şununla düştü:
 *
 *     versionCode (System.getenv("TIKITA_VERSION_CODE") ?: "1").toInteger()
 *
 * Groovy'de metot adından sonra boşluk+parantez ARGÜMAN LİSTESİDİR: önce
 * versionCode("1") STRING ile çağrılır, `.toInteger()` ise o çağrının DÖNÜŞÜNE
 * (AGP setter'ları null döner) uygulanır → "Value is null". Sözdizimi geçerli
 * olduğu için derleme öncesi hiçbir denetim görmez, yalnız CI'da patlar.
 *
 * Bu betik AGP'nin DSL'ini taklit eder (her setter null döner — tuzağın kaynağı
 * birebir korunur), bloğu çalıştırır ve versionCode'un Integer olduğunu doğrular.
 * build.gradle'a dokununca koştur.
 */
class Sahte {
  def gelen = [:]
  def methodMissing(String ad, args) {
    def a = args.length == 1 ? args[0] : args.toList()
    if (a instanceof Closure) { a.delegate = this; a.resolveStrategy = Closure.DELEGATE_FIRST; a(); return null }
    gelen[ad] = a
    return null                      // AGP setter'ları null döner — tuzak burada doğar
  }
  def propertyMissing(String ad, v) { gelen[ad] = v; null }
  def propertyMissing(String ad) { null }
}

def kok = new Sahte()
def yol = new File("android/app/build.gradle")
if (!yol.exists()) { println "bulunamadı: " + yol; System.exit(1) }
def kod = yol.text.replaceAll(/(?s)^.*?\bandroid\s*\{/, "android {")   // plugins{} bloğunu at

def betik = """
def android(Closure c){ c.delegate = binding.variables.KOK; c.resolveStrategy = Closure.DELEGATE_FIRST; c() }
def dependencies(Closure c){ }
def file(p){ new File(p) }
def JavaVersion = [VERSION_17: "17"]
${kod}
"""

try {
  new GroovyShell(new Binding([KOK: kok])).evaluate(betik)
} catch (e) {
  println "✗ build.gradle ÇALIŞIRKEN PATLADI: " + e.getClass().simpleName + ": " + e.message
  System.exit(1)
}

def hata = 0
def bekle = { ad, tip ->
  def v = kok.gelen[ad]
  if (v == null) { println "  ✗ " + ad + " hiç ayarlanmadı"; hata = 1; return }
  if (!tip.isInstance(v)) { println "  ✗ " + ad + " " + tip.simpleName + " olmalı, " + v.getClass().simpleName + " geldi (" + v + ")"; hata = 1; return }
  println "  ✓ " + ad + " = " + v + " (" + v.getClass().simpleName + ")"
}

println "android{} bloğu çalıştı. Denetim:"
bekle("versionCode", Integer)      // asıl tuzak buydu
bekle("versionName", String)
bekle("compileSdk", Integer)
bekle("minSdk", Integer)
bekle("targetSdk", Integer)
bekle("applicationId", String)
bekle("namespace", String)

println(hata ? "✗ HATA VAR" : "✓ build.gradle çalışma denetimi geçti")
System.exit(hata)
