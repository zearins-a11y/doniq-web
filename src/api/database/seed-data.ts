// Dados de Seed para Inicialização do Doniq
// Garante paridade total entre ambiente local e nuvem (Cloud Run).

export const SEED_DATA = {
  "users": [
    {
      "user_id": "usr_aecb5417b790",
      "email": "zearins@gmail.com",
      "nome": "José",
      "produto": "Endoscopia",
      "vertical": "opme",
      "criado_em": "2026-08-17T18:25:34.925+00:00"
    },
    {
      "user_id": "usr_solo_1789321702179",
      "email": "solo.1789321702179@doniq.com.br",
      "nome": "Consultor Autônomo",
      "produto": "",
      "vertical": "geral",
      "criado_em": "2026-09-01T10:00:00Z"
    },
    {
      "user_id": "usr_resumo_1789321702186",
      "email": "resumo.1789321702186@doniq.com.br",
      "nome": "Líder Solo",
      "produto": "",
      "vertical": "geral",
      "criado_em": "2026-09-01T10:00:00Z"
    },
    {
      "user_id": "usr_solo_1789321758115",
      "email": "solo.1789321758115@doniq.com.br",
      "nome": "Consultor Autônomo",
      "produto": "",
      "vertical": "geral",
      "criado_em": "2026-09-01T10:00:00Z"
    },
    {
      "user_id": "usr_solo_1789321809017",
      "email": "solo.1789321809017@doniq.com.br",
      "nome": "Consultor Autônomo",
      "produto": "",
      "vertical": "geral",
      "criado_em": "2026-09-01T10:00:00Z"
    },
    {
      "user_id": "usr_solo_1789321827310",
      "email": "solo.1789321827310@doniq.com.br",
      "nome": "Consultor Autônomo",
      "produto": "",
      "vertical": "geral",
      "criado_em": "2026-09-01T10:00:00Z"
    }
  ],
  "user": [
    {
      "id": "EI6LTy2tXwm4hutgVCNGErkcK5Nc7anw",
      "name": "José Moreira",
      "email": "zearins@gmail.com",
      "email_verified": 1,
      "image": "https://lh3.googleusercontent.com/a/ACg8ocIlbU3q7JAh81N5VyFBELfV1iWKZrrQaqc4PKAenaojf3X-zufRig=s96-c",
      "created_at": 1787146869727,
      "updated_at": 1787146869727
    }
  ],
  "account": [
    {
      "id": "XaFQoOLYE55OFtJ2dhUWMlnZVzCRlQ5F",
      "account_id": "105824306444004208138",
      "provider_id": "google",
      "user_id": "EI6LTy2tXwm4hutgVCNGErkcK5Nc7anw",
      "access_token": "REDACTED_GOOGLE_ACCESS_TOKEN",
      "refresh_token": null,
      "id_token": "REDACTED_GOOGLE_ID_TOKEN",
      "access_token_expires_at": 1787150891404,
      "refresh_token_expires_at": null,
      "scope": "https://www.googleapis.com/auth/userinfo.email,openid,https://www.googleapis.com/auth/userinfo.profile",
      "password": null,
      "created_at": 1787146869730,
      "updated_at": 1787147293407
    }
  ],
  "compromissos": [
    {
      "compromisso_id": "cmp_84cc6d386448",
      "user_id": "usr_4c608b67e055",
      "empresa": "Cliente Teste LTDA",
      "contato": "",
      "telefone": "",
      "objetivo": "",
      "endereco": "",
      "data_iso": "2026-09-01",
      "hora": "14:00",
      "minutos": 60,
      "status": "aberto",
      "relato_id": "",
      "criado_em": "2026-08-18T11:49:18.111+00:00",
      "atualizado_em": "2026-08-18T11:49:18.111+00:00"
    },
    {
      "compromisso_id": "cmp_259d3a334999",
      "user_id": "usr_508fb3f3600d",
      "empresa": "Cliente Teste LTDA",
      "contato": "",
      "telefone": "",
      "objetivo": "",
      "endereco": "",
      "data_iso": "2026-09-01",
      "hora": "14:00",
      "minutos": 60,
      "status": "cancelado",
      "relato_id": "",
      "criado_em": "2026-08-18T11:49:56.297+00:00",
      "atualizado_em": "2026-08-18T11:49:56.300+00:00"
    }
  ],
  "lista_espera": []
} as const;
