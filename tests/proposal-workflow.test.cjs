const {
  test
} = require('node:test');

const assert =
  require('node:assert/strict');

const fs =
  require('node:fs');

const path =
  require('node:path');

const vm =
  require('node:vm');

const source = fs
  .readFileSync(
    path.join(
      __dirname,
      '..',
      'app.js'
    ),
    'utf8'
  )
  .replace(
    /^export /gm,
    ''
  );

function html(
  proposal,
  editing = false
) {
  const context =
    vm.createContext({
      document: {
        querySelector:
          selector =>
            selector === '#app'
              ? { innerHTML: '' }
              : null,

        querySelectorAll:
          () => [],

        createElement:
          () => ({}),

        body: {
          appendChild:
            () => {}
        }
      },

      setTimeout:
        () => {}
    });

  vm.runInContext(
    source,
    context
  );

  context.proposal =
    proposal;

  context.editing =
    editing;

  return vm.runInContext(`
    state.apartmentId = 'unit-1';

    backend = {
      staffRole: null,

      onSubmit() {},

      proposals: {
        'unit-1': proposal
      },

      editAfterSubmit:
        new Set(
          editing
            ? ['unit-1']
            : []
        )
    };

    proposalWorkflowHtml();
  `, context);
}

test(
  'first proposal exposes initial submission',
  () => {
    const result =
      html(null);

    assert.match(
      result,
      /Enviar proposta à arquiteta/
    );
  }
);

test(
  'open proposal exposes explicit resubmission and counts up to four',
  () => {
    const proposal = {
      cycle_number: 1,
      latest_revision: 1,
      proposalStatus: 'open',
      status:
        'Aguardando análise da arquiteta',
      review: null
    };

    assert.match(
      html(proposal),
      /Alterar proposta/
    );

    assert.match(
      html(proposal, true),
      /Reenviar proposta · envio 2 de 4/
    );
  }
);

test(
  'fourth submission is frozen until architect review',
  () => {
    const result = html(
      {
        cycle_number: 1,
        latest_revision: 4,
        proposalStatus: 'open',

        status:
          'Limite de envios atingido · aguardando análise da arquiteta',

        review: null
      },

      true
    );

    assert.match(
      result,
      /Envio 4 de 4/
    );

    assert.match(
      result,
      /Os quatro envios deste ciclo foram utilizados/
    );

    assert.doesNotMatch(
      result,
      /Alterar proposta/
    );

    assert.doesNotMatch(
      result,
      /Reenviar proposta/
    );
  }
);

test(
  'reviewed cycle can start a new proposal at one of four',
  () => {
    const proposal = {
      cycle_number: 1,
      latest_revision: 4,
      proposalStatus: 'reviewed',
      status:
        'Alterações solicitadas',

      review: {
        note:
          'Ajustar bancada.'
      }
    };

    assert.match(
      html(proposal),
      /Iniciar nova proposta/
    );

    assert.match(
      html(proposal, true),
      /Enviar nova proposta · envio 1 de 4/
    );
  }
);