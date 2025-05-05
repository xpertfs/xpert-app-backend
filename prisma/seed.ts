// prisma/seed.ts

import { PrismaClient, UserRole, ProjectStatus, EmployeeType, PaymentStatus, ExpenseCategory, SyncStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await clearDatabase();

  // Create initial company
  const company = await prisma.company.create({
    data: {
      name: 'XpertBuild Demo Company',
      address: '123 Main Street',
      city: 'Boston',
      state: 'MA',
      zip: '02108',
      phone: '555-123-4567',
      email: 'info@xpertbuild.com',
    },
  });

  console.log(`Created company: ${company.name}`);

  // Create admin user
  const adminPassword = 'password123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@xpertbuild.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      companyId: company.id,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Horizon Properties',
        code: 'HZN001',
        address: '789 Park Avenue',
        city: 'Boston',
        state: 'MA',
        zip: '02116',
        contactName: 'Sarah Johnson',
        phone: '555-222-3333',
        email: 'sjohnson@horizonproperties.com',
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'City Developments Inc',
        code: 'CDI002',
        address: '456 Tower Road',
        city: 'Cambridge',
        state: 'MA',
        zip: '02142',
        contactName: 'Michael Chen',
        phone: '555-444-5555',
        email: 'mchen@citydevelopments.com',
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        name: 'Northeast Healthcare',
        code: 'NHC003',
        address: '101 Medical Drive',
        city: 'Brookline',
        state: 'MA',
        zip: '02445',
        contactName: 'Lisa Martinez',
        phone: '555-666-7777',
        email: 'lmartinez@nehealthcare.org',
        companyId: company.id,
      },
    }),
  ]);

  console.log(`Created ${clients.length} clients`);

  // Create contractors
  const contractors = await Promise.all([
    prisma.contractor.create({
      data: {
        name: 'Reliable Builders',
        code: 'RB001',
        address: '222 Construction Blvd',
        city: 'Boston',
        state: 'MA',
        zip: '02110',
        contactName: 'Robert Builder',
        phone: '555-888-9999',
        email: 'rbuilder@reliablebuilders.com',
        companyId: company.id,
      },
    }),
    prisma.contractor.create({
      data: {
        name: 'Advanced Construction Solutions',
        code: 'ACS002',
        address: '333 Industry Way',
        city: 'Cambridge',
        state: 'MA',
        zip: '02142',
        contactName: 'Jennifer Brooks',
        phone: '555-777-6666',
        email: 'jbrooks@advancedconstruction.com',
        companyId: company.id,
      },
    }),
  ]);

  console.log(`Created ${contractors.length} contractors`);

  // Create union classes
  const unionClasses = await Promise.all([
    prisma.unionClass.create({
      data: {
        name: 'Carpenter',
        companyId: company.id,
        baseRates: {
          create: {
            regularRate: 38.5,
            overtimeRate: 57.75,
            benefitsRate: 15.4,
            effectiveDate: new Date('2024-01-01'),
          },
        },
        customRates: {
          create: [
            {
              name: 'Holiday Rate',
              description: 'Holiday pay rate',
              rate: 77.0,
              effectiveDate: new Date('2024-01-01'),
            },
            {
              name: 'Night Shift Premium',
              description: 'Night shift differential',
              rate: 3.85,
              effectiveDate: new Date('2024-01-01'),
            }
          ]
        }
      },
    }),
    prisma.unionClass.create({
      data: {
        name: 'Electrician',
        companyId: company.id,
        baseRates: {
          create: {
            regularRate: 42.75,
            overtimeRate: 64.13,
            benefitsRate: 17.1,
            effectiveDate: new Date('2024-01-01'),
          },
        },
        customRates: {
          create: [
            {
              name: 'Holiday Rate',
              description: 'Holiday pay rate',
              rate: 85.5,
              effectiveDate: new Date('2024-01-01'),
            },
            {
              name: 'Night Shift Premium',
              description: 'Night shift differential',
              rate: 4.28,
              effectiveDate: new Date('2024-01-01'),
            }
          ]
        }
      },
    }),
    prisma.unionClass.create({
      data: {
        name: 'Plumber',
        companyId: company.id,
        baseRates: {
          create: {
            regularRate: 40.25,
            overtimeRate: 60.38,
            benefitsRate: 16.1,
            effectiveDate: new Date('2024-01-01'),
          },
        },
        customRates: {
          create: [
            {
              name: 'Holiday Rate',
              description: 'Holiday pay rate',
              rate: 80.5,
              effectiveDate: new Date('2024-01-01'),
            },
            {
              name: 'Night Shift Premium',
              description: 'Night shift differential',
              rate: 4.03,
              effectiveDate: new Date('2024-01-01'),
            }
          ]
        }
      },
    }),
  ]);

  console.log(`Created ${unionClasses.length} union classes`);

  // Create employees
  const employees = await Promise.all([
    // Local employees
    prisma.employee.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        code: 'JS001',
        email: 'jsmith@example.com',
        phone: '555-111-2222',
        type: EmployeeType.LOCAL,
        rate: 35.00,
        hireDate: new Date('2023-03-15'),
        companyId: company.id,
      },
    }),
    prisma.employee.create({
      data: {
        firstName: 'Emily',
        lastName: 'Davis',
        code: 'ED002',
        email: 'edavis@example.com',
        phone: '555-333-4444',
        type: EmployeeType.LOCAL,
        rate: 32.50,
        hireDate: new Date('2023-05-10'),
        companyId: company.id,
      },
    }),
    // Union employees
    prisma.employee.create({
      data: {
        firstName: 'Robert',
        lastName: 'Johnson',
        code: 'RJ003',
        email: 'rjohnson@example.com',
        phone: '555-555-6666',
        type: EmployeeType.UNION,
        hireDate: new Date('2023-02-01'),
        companyId: company.id,
        unionClassId: unionClasses[0].id, // Carpenter
      },
    }),
    prisma.employee.create({
      data: {
        firstName: 'Maria',
        lastName: 'Garcia',
        code: 'MG004',
        email: 'mgarcia@example.com',
        phone: '555-777-8888',
        type: EmployeeType.UNION,
        hireDate: new Date('2023-04-20'),
        companyId: company.id,
        unionClassId: unionClasses[1].id, // Electrician
      },
    }),
    prisma.employee.create({
      data: {
        firstName: 'David',
        lastName: 'Wilson',
        code: 'DW005',
        email: 'dwilson@example.com',
        phone: '555-999-0000',
        type: EmployeeType.UNION,
        hireDate: new Date('2023-06-15'),
        companyId: company.id,
        unionClassId: unionClasses[2].id, // Plumber
      },
    }),
  ]);

  console.log(`Created ${employees.length} employees`);

  // Create projects with scopes and sub-scopes
  const projects = await Promise.all([
    // Project 1: Commercial Building
    createProject({
      name: 'Commercial Office Building',
      code: 'COM001',
      description: 'Four-story office building with underground parking',
      address: '222 Business Ave',
      city: 'Boston',
      state: 'MA',
      zip: '02110',
      status: ProjectStatus.IN_PROGRESS,
      value: 2500000,
      clientId: clients[0].id,
      contractorId: contractors[0].id,
      companyId: company.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-08-31'),
    }),
    // Project 2: Residential Complex
    createProject({
      name: 'Riverside Residences',
      code: 'RES002',
      description: 'Multi-family residential complex with 24 units',
      address: '55 River Road',
      city: 'Cambridge',
      state: 'MA',
      zip: '02138',
      status: ProjectStatus.PLANNING,
      value: 3800000,
      clientId: clients[1].id,
      contractorId: contractors[1].id,
      companyId: company.id,
      startDate: new Date('2024-06-15'),
      endDate: new Date('2025-12-31'),
    }),
    // Project 3: Healthcare Renovation
    createProject({
      name: 'Medical Center Renovation',
      code: 'MED003',
      description: 'Renovation of existing medical center',
      address: '33 Health Drive',
      city: 'Brookline',
      state: 'MA',
      zip: '02445',
      status: ProjectStatus.IN_PROGRESS,
      value: 1200000,
      clientId: clients[2].id,
      companyId: company.id,
      startDate: new Date('2024-02-15'),
      endDate: new Date('2024-11-30'),
    }),
  ]);

  console.log(`Created ${projects.length} projects with scopes and sub-scopes`);

  // Create time entries and expenses
  await createSampleTimeEntries(projects[0].id, employees, company.id);
  await createSampleExpenses(projects[0].id, company.id);

  console.log('Database seed completed successfully');
}

async function clearDatabase() {
  // Delete data in reverse order of dependencies
  // Check if tables exist before attempting to delete
  try {
    // Try-catch blocks for tables that might not exist
    try {
      await prisma.syncLog.deleteMany();
    } catch (error) {
      console.log('SyncLog table not found, skipping');
    }
    
    try {
      await prisma.sheetConnection.deleteMany();
    } catch (error) {
      console.log('SheetConnection table not found, skipping');
    }
    
    await prisma.timeEntry.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.workItemQuantity.deleteMany();
    await prisma.subScope.deleteMany();
    await prisma.scope.deleteMany();
    await prisma.workItem.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.project.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.unionClassCustomRate.deleteMany();
    await prisma.unionClassBaseRate.deleteMany();
    await prisma.unionClass.deleteMany();
    await prisma.client.deleteMany();
    await prisma.contractor.deleteMany();
    await prisma.vendorPrice.deleteMany();
    await prisma.material.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  } catch (error) {
    console.error('Error during database clearing:', error);
    console.log('Continuing with seeding...');
  }

  console.log('Database cleared');
}

async function createProject(projectData: any) {
  // Create project
  const project = await prisma.project.create({
    data: {
      name: projectData.name,
      code: projectData.code,
      description: projectData.description,
      address: projectData.address,
      city: projectData.city,
      state: projectData.state,
      zip: projectData.zip,
      status: projectData.status,
      value: projectData.value,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      clientId: projectData.clientId,
      contractorId: projectData.contractorId,
      companyId: projectData.companyId,
    },
  });

  // Create work items
  const workItems = await Promise.all([
    prisma.workItem.create({
      data: {
        code: 'FORM100',
        name: 'Concrete Formwork',
        description: 'Formwork for concrete structures',
        unit: 'SF',
        unitPrice: 3.50,
        projectId: project.id,
      },
    }),
    prisma.workItem.create({
      data: {
        code: 'CONC200',
        name: 'Concrete Pouring',
        description: 'Pouring and finishing concrete',
        unit: 'CY',
        unitPrice: 130.00,
        projectId: project.id,
      },
    }),
    prisma.workItem.create({
      data: {
        code: 'FRAM300',
        name: 'Wood Framing',
        description: 'Wood framing for walls and structures',
        unit: 'SF',
        unitPrice: 8.75,
        projectId: project.id,
      },
    }),
    prisma.workItem.create({
      data: {
        code: 'ELEC400',
        name: 'Electrical Rough-In',
        description: 'Electrical rough-in work',
        unit: 'EA',
        unitPrice: 45.25,
        projectId: project.id,
      },
    }),
    prisma.workItem.create({
      data: {
        code: 'PLMB500',
        name: 'Plumbing Rough-In',
        description: 'Plumbing rough-in work',
        unit: 'EA',
        unitPrice: 55.00,
        projectId: project.id,
      },
    }),
  ]);

  // Create scopes and sub-scopes
  const scopes = [
    {
      name: 'Site Work',
      code: 'S100',
      subScopes: [
        { name: 'Demolition', code: 'S110' },
        { name: 'Excavation', code: 'S120' },
        { name: 'Utilities', code: 'S130' },
      ],
    },
    {
      name: 'Foundation',
      code: 'F200',
      subScopes: [
        { name: 'Formwork', code: 'F210' },
        { name: 'Reinforcement', code: 'F220' },
        { name: 'Concrete', code: 'F230' },
      ],
    },
    {
      name: 'Structure',
      code: 'S300',
      subScopes: [
        { name: 'Framing', code: 'S310' },
        { name: 'Flooring', code: 'S320' },
        { name: 'Roofing', code: 'S330' },
      ],
    },
    {
      name: 'MEP',
      code: 'M400',
      subScopes: [
        { name: 'Electrical', code: 'M410' },
        { name: 'Plumbing', code: 'M420' },
        { name: 'HVAC', code: 'M430' },
      ],
    },
    {
      name: 'Finishes',
      code: 'F500',
      subScopes: [
        { name: 'Drywall', code: 'F510' },
        { name: 'Painting', code: 'F520' },
        { name: 'Flooring', code: 'F530' },
      ],
    },
  ];

  // Create scopes
  for (const scopeData of scopes) {
    const scope = await prisma.scope.create({
      data: {
        name: scopeData.name,
        code: scopeData.code,
        projectId: project.id,
      },
    });

    // Create sub-scopes
    for (const subScopeData of scopeData.subScopes) {
      const subScope = await prisma.subScope.create({
        data: {
          name: subScopeData.name,
          code: subScopeData.code,
          scopeId: scope.id,
          percentComplete: Math.random() * 50, // Random completion percentage
        },
      });

      // Assign random work items to sub-scopes
      const randomWorkItems = workItems
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      for (const workItem of randomWorkItems) {
        await prisma.workItemQuantity.create({
          data: {
            subScopeId: subScope.id,
            workItemId: workItem.id,
            quantity: Math.floor(Math.random() * 100) + 50,
            completed: Math.floor(Math.random() * 30),
          },
        });
      }
    }
  }

  return project;
}

/**
 * Create sample time entries for a project
 */
async function createSampleTimeEntries(projectId: string, employees: any[], companyId: string) {
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(now.getMonth() - 1);

  // Create time entries for each day in the last month
  for (let day = 0; day < 30; day++) {
    const entryDate = new Date(startDate);
    entryDate.setDate(startDate.getDate() + day);

    // Skip weekends
    if (entryDate.getDay() === 0 || entryDate.getDay() === 6) {
      continue;
    }

    // Create entries for random employees
    const randomEmployees = employees
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 1);

    for (const employee of randomEmployees) {
      await prisma.timeEntry.create({
        data: {
          employeeId: employee.id,
          projectId,
          date: entryDate,
          regularHours: Math.floor(Math.random() * 4) + 4, // 4-8 hours
          overtimeHours: Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0, // Occasional overtime
          doubleHours: Math.random() > 0.9 ? Math.floor(Math.random() * 2) : 0, // Rare double time
          paymentStatus: PaymentStatus.APPROVED,
          notes: 'Sample time entry',
        },
      });
    }
  }

  console.log('Created sample time entries');
}

/**
 * Create sample expenses for a project
 */
async function createSampleExpenses(projectId: string, companyId: string) {
  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'ABC Supply Co.',
        code: 'ABC001',
        address: '100 Supply Street',
        city: 'Boston',
        state: 'MA',
        contactName: 'John Supplier',
        phone: '555-123-7890',
        email: 'jsupplier@abcsupply.com',
        companyId,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'XYZ Tools & Equipment',
        code: 'XYZ002',
        address: '200 Tool Avenue',
        city: 'Cambridge',
        state: 'MA',
        contactName: 'Mary Toolmaker',
        phone: '555-456-7890',
        email: 'mtool@xyztools.com',
        companyId,
      },
    }),
  ]);

  // Create materials
  const materials = await Promise.all([
    prisma.material.create({
      data: {
        code: 'LUM001',
        name: '2x4 Lumber',
        description: 'Standard 2x4 lumber',
        unit: 'LF',
        category: 'Wood',
        companyId,
      },
    }),
    prisma.material.create({
      data: {
        code: 'CNC001',
        name: 'Concrete Mix',
        description: 'Standard concrete mix',
        unit: 'BAG',
        category: 'Concrete',
        companyId,
      },
    }),
  ]);

  // Create vendor prices
  await Promise.all([
    prisma.vendorPrice.create({
      data: {
        materialId: materials[0].id,
        vendorId: vendors[0].id,
        price: 0.65,
        effectiveDate: new Date(),
      },
    }),
    prisma.vendorPrice.create({
      data: {
        materialId: materials[0].id,
        vendorId: vendors[1].id,
        price: 0.68,
        effectiveDate: new Date(),
      },
    }),
    prisma.vendorPrice.create({
      data: {
        materialId: materials[1].id,
        vendorId: vendors[0].id,
        price: 6.95,
        effectiveDate: new Date(),
      },
    }),
  ]);

  // Create expense categories
  const categoryOptions = [
    ExpenseCategory.MATERIAL, 
    ExpenseCategory.TOOL, 
    ExpenseCategory.RENTAL, 
    ExpenseCategory.OPERATIONAL
  ];

  // Create expenses
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(now.getMonth() - 2);

  for (let i = 0; i < 20; i++) {
    const expenseDate = new Date(startDate);
    expenseDate.setDate(startDate.getDate() + Math.floor(Math.random() * 60));

    const category = categoryOptions[Math.floor(Math.random() * categoryOptions.length)];
    const vendorId = vendors[Math.floor(Math.random() * vendors.length)].id;
    const amount = Math.floor(Math.random() * 1000) + 100;

    await prisma.expense.create({
      data: {
        date: expenseDate,
        amount,
        description: `Sample ${category.toLowerCase()} expense`,
        category: category,
        reference: `INV-${Math.floor(Math.random() * 10000)}`,
        recurring: Math.random() > 0.8,
        projectId,
        vendorId,
        companyId,
      },
    });
  }

  console.log('Created sample expenses');
}

// Run the seed function
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });