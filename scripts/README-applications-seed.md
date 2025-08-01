# Application Seeding Script

This script creates sample applications with various statuses for testing and development purposes.

## Prerequisites

Before running the application seed script, ensure you have:

1. **Database set up**: Run the main seed script first

   ```bash
   npm run seed
   ```

2. **Required data**: The script needs existing:
   - Service categories
   - Officer users with profiles
   - Frontdesk users

## Usage

### Seed Applications

```bash
npm run seed:applications
```

## What the Script Creates

### Application Distribution

- **80-130 applications** with random statuses
- **Realistic citizen data** from Sikkim region
- **Proper workflow history** for each application
- **Officer assignments** for IN_PROGRESS applications
- **Document validation records** for validated applications

### Status Distribution

The script creates applications with weighted random distribution:

- **OPEN** (15%): Applications waiting for officer assignment
- **IN_PROGRESS** (20%): Applications currently being processed
- **RESOLVED** (18%): Successfully completed applications
- **CLOSED** (12%): Applications closed by officers
- **REOPENED** (10%): Previously resolved applications reopened
- **VALIDATED** (25%): Applications validated by frontdesk

### Features Created

#### 1. Realistic Workflow History

Each application includes proper workflow transitions:

- DRAFT → PENDING → VALIDATED → OPEN → IN_PROGRESS → RESOLVED/CLOSED
- REOPENED status includes previous RESOLVED entry
- Random comments for each workflow step

#### 2. Officer Assignments

- Random officer assignment for IN_PROGRESS applications
- Proper officer assignment records with priorities
- Instructions for processing

#### 3. Application Validation

- RR number generation for validated applications
- Validation records with frontdesk officer details
- Document completion flags

#### 4. Citizen Data

Includes realistic Sikkim citizen information:

- Names: Sikkimese, Nepali, and Indian names
- Locations: Real places in Sikkim (Gangtok, Namchi, Pelling, etc.)
- Phone numbers: Realistic format
- Email addresses: Generated from names
- Aadhaar numbers: Sample format

#### 5. Service Categories

Applications are distributed across available service categories:

- Revenue Certificate requests
- Land Registration applications
- License applications
- Various certificate types

## Output

The script provides real-time progress updates:

```
🌱 Seeding applications...
📋 Found 3 service categories
👥 Found 15 officers
🏢 Found 2 frontdesk users
🎯 Creating 95 applications...
✅ Created 10/95 applications
...
📊 Application Status Distribution:
   OPEN: 14
   IN_PROGRESS: 19
   RESOLVED: 17
   CLOSED: 11
   REOPENED: 9
   VALIDATED: 25
🎉 Application seeding completed successfully!
```

## Database Tables Populated

1. **applications**: Main application records
2. **application_workflow**: Status change history
3. **application_validation**: Frontdesk validation records
4. **officer_assignment**: Officer assignment records

## Testing the Results

After running the seed script, you can:

1. **Track applications** using the track page with:

   - Any phone number from SAMPLE_CITIZENS
   - Any generated RR number

2. **View officer dashboards** to see assigned applications

3. **Test frontdesk workflows** with various application statuses

## Sample Phone Numbers for Testing

You can use any of these phone numbers to track applications:

- 9876543210 (Ramesh Kumar Sharma)
- 9876543211 (Sunita Devi)
- 9876543212 (Tenzin Norbu)
- ... (up to 9876543229)

## Notes

- Applications are created with realistic date ranges (last 3 months)
- Officer assignments respect the application status
- Workflow entries include proper timestamps
- All generated data follows the database schema constraints
- RR numbers follow the format: RR{YEAR}{4-digit-random}

## Troubleshooting

If the script fails:

1. **Check database connection**: Ensure your DATABASE_URL is correct
2. **Run main seed first**: The script needs existing officers and service categories
3. **Check console output**: Error messages will indicate specific issues
4. **Verify Prisma schema**: Ensure your database schema is up to date

```bash
npx prisma migrate deploy
npx prisma generate
```
