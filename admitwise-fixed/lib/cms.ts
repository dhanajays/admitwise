import { db } from "@/lib/db"

export async function getCmsSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const setting = await db.websiteSetting.findUnique({
      where: { key },
    })

    if (setting && setting.value) {
      return JSON.parse(setting.value) as T
    }
  } catch (error) {
    console.warn(`⚠️ Failed to load CMS key "${key}" from database, using fallback content.`, error)
  }
  return fallback
}
