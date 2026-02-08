import fs from 'fs'
import path from 'path'

const REQUIREMENTS_DIR = path.join(process.cwd(), 'config', 'requirements')

export interface RequirementFile {
  slug: string
  name: string
  content: string
  updatedAt: string
}

// Convert slug to display name
function slugToName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function listRequirements(): RequirementFile[] {
  try {
    const files = fs.readdirSync(REQUIREMENTS_DIR)
    
    return files
      .filter(f => f.endsWith('.md'))
      .map(filename => {
        const slug = filename.replace('.md', '')
        const filePath = path.join(REQUIREMENTS_DIR, filename)
        const stats = fs.statSync(filePath)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        return {
          slug,
          name: slugToName(slug),
          content,
          updatedAt: stats.mtime.toISOString()
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error listing requirements:', error)
    return []
  }
}

export function getRequirement(slug: string): RequirementFile | null {
  try {
    const filePath = path.join(REQUIREMENTS_DIR, `${slug}.md`)
    
    if (!fs.existsSync(filePath)) {
      return null
    }
    
    const stats = fs.statSync(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    return {
      slug,
      name: slugToName(slug),
      content,
      updatedAt: stats.mtime.toISOString()
    }
  } catch (error) {
    console.error('Error getting requirement:', error)
    return null
  }
}

export function saveRequirement(slug: string, content: string): boolean {
  try {
    const filePath = path.join(REQUIREMENTS_DIR, `${slug}.md`)
    fs.writeFileSync(filePath, content)
    return true
  } catch (error) {
    console.error('Error saving requirement:', error)
    return false
  }
}

export function createRequirement(slug: string, content: string): boolean {
  try {
    const filePath = path.join(REQUIREMENTS_DIR, `${slug}.md`)
    
    if (fs.existsSync(filePath)) {
      return false // Already exists
    }
    
    fs.writeFileSync(filePath, content)
    return true
  } catch (error) {
    console.error('Error creating requirement:', error)
    return false
  }
}

export function deleteRequirement(slug: string): boolean {
  try {
    const filePath = path.join(REQUIREMENTS_DIR, `${slug}.md`)
    
    if (!fs.existsSync(filePath)) {
      return false
    }
    
    fs.unlinkSync(filePath)
    return true
  } catch (error) {
    console.error('Error deleting requirement:', error)
    return false
  }
}
