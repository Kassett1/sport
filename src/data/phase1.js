export const phaseOne = {
  id: 'phase-1',
  name: 'Phase 1',
  finalCircuit: [
    '10 tractions',
    '20 pompes',
    '10 pistol squats',
    '1 minute de gainage',
    '12 dips',
    '10 sec de L-sit',
  ],
  families: [
    {
      id: 'tractions',
      name: 'Tractions',
      finalGoal: '10 tractions',
      levels: [
        {
          id: 'tractions-australiennes',
          name: 'Niveau 1 - tractions australiennes',
          validation: '15 reps pour valider.',
        },
        {
          id: 'tractions-suspension',
          name: 'Niveau 1 bis - suspension',
          validation: 'Tenir 30 sec confortablement.',
          optional: true,
        },
        {
          id: 'tractions-elastique',
          name: 'Niveau 2 - tractions avec elastique',
          validation: '6 reps pour valider.',
          optional: true,
        },
        {
          id: 'tractions-negatives',
          name: 'Niveau 3 - tractions negatives',
          validation: '6 reps de minimum 10 sec, avec arret possible 2-3 sec pendant la descente.',
        },
        {
          id: 'tractions-strictes',
          name: 'Niveau 4 - tractions',
          validation: '10 reps pour valider.',
        },
      ],
    },
    {
      id: 'pompes',
      name: 'Pompes',
      finalGoal: '20 pompes',
      levels: [
        {
          id: 'pompes-mains-surelevees',
          name: 'Niveau 1 - pompes mains surelevees',
          validation: '20 reps pour valider.',
        },
        {
          id: 'pompes-genoux',
          name: 'Niveau 2 - pompes a genoux',
          validation: '20 reps pour valider.',
        },
        {
          id: 'pompes-negatives',
          name: 'Niveau 3 - pompes negatives',
          validation: '12 reps avec arret possible 2-3 sec pendant la descente.',
        },
        {
          id: 'pompes-strictes',
          name: 'Niveau 4 - pompes',
          validation: '20 reps pour valider.',
        },
      ],
    },
    {
      id: 'pistol-squats',
      name: 'Pistol squats',
      finalGoal: '10 pistol squats',
      levels: [
        {
          id: 'demi-squats',
          name: 'Niveau 1 - demi squats',
          validation: '20 reps pour valider.',
        },
        {
          id: 'squats-profonds',
          name: 'Niveau 2 - squats profonds',
          validation: '20 reps pour valider.',
        },
        {
          id: 'pistol-assistes',
          name: 'Niveau 3 - pistol squats assistes',
          validation: '10 reps de chaque cote avec le minimum d assistance possible.',
        },
        {
          id: 'pistol-stricts',
          name: 'Niveau 4 - pistol squats',
          validation: '6 reps de chaque cote pour valider.',
        },
      ],
    },
    {
      id: 'gainage',
      name: 'Gainage',
      finalGoal: '1 minute de gainage',
      levels: [
        {
          id: 'gainage-adapte',
          name: 'Niveau 1 - gainage a genoux ou pieds ecartes',
          validation: '30 sec pour valider.',
        },
        {
          id: 'gainage-classique',
          name: 'Niveau 2 - gainage',
          validation: '60 sec confortablement pour valider.',
        },
      ],
    },
    {
      id: 'dips',
      name: 'Dips',
      finalGoal: '12 dips',
      levels: [
        {
          id: 'dips-jambes-pliees',
          name: 'Niveau 1 - dips sur support jambes pliees',
          validation: '12 reps pour valider.',
        },
        {
          id: 'dips-jambes-tendues',
          name: 'Niveau 2 - dips sur support jambes tendues',
          validation: '12 reps pour valider.',
        },
        {
          id: 'dips-negatifs',
          name: 'Niveau 3 - dips negatifs',
          validation: '8 reps pour valider.',
        },
        {
          id: 'dips-stricts',
          name: 'Niveau 4 - dips',
          validation: '12 reps pour valider.',
        },
      ],
    },
    {
      id: 'l-sit',
      name: 'L-sit',
      finalGoal: '10 sec de L-sit',
      levels: [
        {
          id: 'l-sit-soulever',
          name: 'Niveau 1 - se soulever',
          validation: '6-8 sec pour valider.',
        },
        {
          id: 'l-sit-sol',
          name: 'Niveau 2 - se soulever au sol',
          validation: '6-8 sec pour valider.',
        },
        {
          id: 'l-sit-releves-jambes',
          name: 'Niveau 2 bis - releves de jambes',
          validation: '10 reps, mains au-dela des genoux.',
          optional: true,
        },
        {
          id: 'l-sit-deplier-jambes',
          name: 'Niveau 3 - deplier les jambes',
          validation: 'Se soulever jambes depliees 5 sec.',
        },
        {
          id: 'l-sit-final',
          name: 'Niveau 4 - L-sit',
          validation: '10 sec pour valider.',
        },
      ],
    },
  ],
};
